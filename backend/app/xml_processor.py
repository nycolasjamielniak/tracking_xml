import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from datetime import datetime

class NFXMLProcessor:
    def __init__(self, xml_content: str):
        self.root = ET.fromstring(xml_content)
        # Obtém o namespace da NFe
        self.ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}

    def _find_with_ns(self, element: ET.Element, path: str) -> Optional[ET.Element]:
        """Busca elementos considerando o namespace da NFe"""
        return element.find(f'.//nfe:{path}', self.ns)

    def validate(self) -> bool:
        """Valida se os campos obrigatórios existem"""
        try:
            nfe = self.root.find('.//nfe:NFe', self.ns)
            infNFe = nfe.find('.//nfe:infNFe', self.ns)
            
            # Campos obrigatórios
            required_fields = [
                ('emit', ['CNPJ', 'xNome']),           # Remetente
                ('dest', ['CNPJ', 'xNome']),           # Destinatário
                ('ide/nNF',),                          # Número da NF
                ('transp/vol', ['qVol', 'pesoB']),     # Volume e Peso
            ]
            
            for field in required_fields:
                base_path = field[0]
                if len(field) > 1:
                    # Verifica campos aninhados
                    base_element = self._find_with_ns(infNFe, base_path)
                    if not base_element:
                        return False
                    for subfield in field[1]:
                        if self._find_with_ns(base_element, subfield) is None:
                            return False
                else:
                    # Verifica campo direto
                    if self._find_with_ns(infNFe, base_path) is None:
                        return False
            
            return True
            
        except (ET.ParseError, AttributeError):
            return False

    def extract_data(self) -> Dict[str, Any]:
        """Extrai os dados relevantes do XML da NFe"""
        nfe = self.root.find('.//nfe:NFe', self.ns)
        infNFe = nfe.find('.//nfe:infNFe', self.ns)
        
        # Função auxiliar para extrair texto de um elemento
        def get_text(element: ET.Element, path: str) -> str:
            el = self._find_with_ns(element, path)
            return el.text if el is not None else ''

        # Extrai dados do emitente
        emit = self._find_with_ns(infNFe, 'emit')
        enderEmit = self._find_with_ns(emit, 'enderEmit')
        
        # Extrai dados do destinatário
        dest = self._find_with_ns(infNFe, 'dest')
        enderDest = self._find_with_ns(dest, 'enderDest')
        
        # Extrai dados do transporte
        transp = self._find_with_ns(infNFe, 'transp')
        vol = self._find_with_ns(transp, 'vol')

        return {
            "numeroNF": get_text(infNFe, 'ide/nNF'),
            "remetente": {
                "cnpj": get_text(emit, 'CNPJ'),
                "nome": get_text(emit, 'xNome'),
                "endereco": {
                    "logradouro": get_text(enderEmit, 'xLgr'),
                    "numero": get_text(enderEmit, 'nro'),
                    "bairro": get_text(enderEmit, 'xBairro'),
                    "municipio": get_text(enderEmit, 'xMun'),
                    "uf": get_text(enderEmit, 'UF'),
                    "cep": get_text(enderEmit, 'CEP')
                }
            },
            "destinatario": {
                "cnpj": get_text(dest, 'CNPJ'),
                "nome": get_text(dest, 'xNome'),
                "endereco": {
                    "logradouro": get_text(enderDest, 'xLgr'),
                    "numero": get_text(enderDest, 'nro'),
                    "bairro": get_text(enderDest, 'xBairro'),
                    "municipio": get_text(enderDest, 'xMun'),
                    "uf": get_text(enderDest, 'UF'),
                    "cep": get_text(enderDest, 'CEP')
                }
            },
            "transporte": {
                "volume": int(get_text(vol, 'qVol') or 0),
                "pesoBruto": float(get_text(vol, 'pesoB') or 0)
            }
        }

async def process_xml_files(files: List[UploadFile]) -> List[Dict[str, Any]]:
    results = []
    errors = []
    
    for file in files:
        try:
            content = await file.read()
            xml_content = content.decode('utf-8')
            
            processor = NFXMLProcessor(xml_content)
            
            if not processor.validate():
                errors.append(f"Arquivo {file.filename} inválido: campos obrigatórios ausentes")
                continue
                
            data = processor.extract_data()
            results.append(data)
            
        except ET.ParseError as e:
            errors.append(f"Erro ao processar {file.filename}: XML inválido")
        except Exception as e:
            errors.append(f"Erro ao processar {file.filename}: {str(e)}")
        finally:
            await file.seek(0)
    
    if errors:
        raise ValueError("\n".join(errors))
    
    return results

def create_trip_structure(processed_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Cria a estrutura da viagem a partir dos dados processados"""
    # Agrupa notas por município para criar pontos de parada
    stops = {}
    for nf in processed_data:
        # Coleta
        coleta_key = f"{nf['remetente']['endereco']['municipio']}-{nf['remetente']['endereco']['uf']}"
        if coleta_key not in stops:
            stops[coleta_key] = {
                "tipo": "COLETA",
                "endereco": nf['remetente']['endereco'],
                "notas": []
            }
        stops[coleta_key]["notas"].append({
            "numeroNF": nf["numeroNF"],
            "volume": nf["transporte"]["volume"],
            "pesoBruto": nf["transporte"]["pesoBruto"]
        })
        
        # Entrega
        entrega_key = f"{nf['destinatario']['endereco']['municipio']}-{nf['destinatario']['endereco']['uf']}"
        if entrega_key not in stops:
            stops[entrega_key] = {
                "tipo": "ENTREGA",
                "endereco": nf['destinatario']['endereco'],
                "notas": []
            }
        stops[entrega_key]["notas"].append({
            "numeroNF": nf["numeroNF"],
            "volume": nf["transporte"]["volume"],
            "pesoBruto": nf["transporte"]["pesoBruto"]
        })

    return {
        "id": datetime.now().strftime("%Y%m%d%H%M%S"),
        "status": "PENDENTE",
        "dataCriacao": datetime.now().isoformat(),
        "veiculo": {
            "tipo": "TRUCK",  # Pode ser configurável
            "placa": ""  # Será preenchido posteriormente
        },
        "motorista": {
            "nome": "",  # Será preenchido posteriormente
            "documento": ""
        },
        "paradas": list(stops.values())
    } 
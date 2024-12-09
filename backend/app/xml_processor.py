import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from datetime import datetime

class NFXMLProcessor:
    def __init__(self, xml_content: str):
        self.root = ET.fromstring(xml_content)
        self.namespace = self._get_namespace()

    def _get_namespace(self) -> str:
        # Extrai o namespace do XML (comum em NFes)
        if '}' in self.root.tag:
            return self.root.tag.split('}')[0] + '}'
        return ''

    def _find_with_ns(self, path: str) -> Optional[ET.Element]:
        # Busca elementos considerando o namespace
        return self.root.find(f'.//{self.namespace}{path}')

    def validate(self) -> bool:
        # Valida se os campos obrigatórios existem
        required_fields = [
            'emit/CNPJ', 'emit/xNome',  # Remetente
            'dest/CNPJ', 'dest/xNome',  # Destinatário
            'nNF',                      # Número da NF
            'vol/pesoB',                # Peso Bruto
            'vol/qVol'                  # Volume
        ]
        
        for field in required_fields:
            if not self._find_with_ns(field):
                return False
        return True

    def extract_data(self) -> Dict[str, Any]:
        # Extrai os dados relevantes do XML
        return {
            "numeroNF": self._find_with_ns('nNF').text,
            "remetente": {
                "cnpj": self._find_with_ns('emit/CNPJ').text,
                "nome": self._find_with_ns('emit/xNome').text,
                "endereco": {
                    "logradouro": self._find_with_ns('emit/enderEmit/xLgr').text,
                    "numero": self._find_with_ns('emit/enderEmit/nro').text,
                    "bairro": self._find_with_ns('emit/enderEmit/xBairro').text,
                    "municipio": self._find_with_ns('emit/enderEmit/xMun').text,
                    "uf": self._find_with_ns('emit/enderEmit/UF').text,
                    "cep": self._find_with_ns('emit/enderEmit/CEP').text
                }
            },
            "destinatario": {
                "cnpj": self._find_with_ns('dest/CNPJ').text,
                "nome": self._find_with_ns('dest/xNome').text,
                "endereco": {
                    "logradouro": self._find_with_ns('dest/enderDest/xLgr').text,
                    "numero": self._find_with_ns('dest/enderDest/nro').text,
                    "bairro": self._find_with_ns('dest/enderDest/xBairro').text,
                    "municipio": self._find_with_ns('dest/enderDest/xMun').text,
                    "uf": self._find_with_ns('dest/enderDest/UF').text,
                    "cep": self._find_with_ns('dest/enderDest/CEP').text
                }
            },
            "peso": float(self._find_with_ns('vol/pesoB').text),
            "volume": int(self._find_with_ns('vol/qVol').text),
            "valor": float(self._find_with_ns('vNF').text)
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
    """
    Cria a estrutura da viagem a partir dos dados processados
    """
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
            "peso": nf["peso"],
            "volume": nf["volume"],
            "valor": nf["valor"]
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
            "peso": nf["peso"],
            "volume": nf["volume"],
            "valor": nf["valor"]
        })

    # Cria a estrutura final da viagem
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
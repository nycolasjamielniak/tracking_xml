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
        try:
            if element is None:
                print(f"Elemento base é None para path: {path}")
                return None
            
            if not isinstance(element, ET.Element):
                print(f"Elemento não é do tipo Element para path: {path}")
                return None
            
            result = element.find(f'.//nfe:{path}', self.ns)
            print(f"Buscando path: {path}, Resultado: {'Encontrado' if result is not None else 'Não encontrado'}")
            return result
        except Exception as e:
            print(f"Erro ao buscar {path}: {str(e)}")
            return None

    def validate(self) -> Dict[str, List[str]]:
        """
        Valida os campos do XML e retorna um dicionário com status e mensagens
        Returns:
            Dict com status da validação e lista de mensagens de campos ausentes
        """
        validation_result = {
            "is_valid": True,
            "missing_fields": []
        }
        
        try:
            nfe = self.root.find('.//nfe:NFe', self.ns)
            if nfe is None:
                validation_result["is_valid"] = False
                validation_result["missing_fields"].append("NFe (Nota Fiscal não encontrada no XML)")
                return validation_result
            
            infNFe = nfe.find('.//nfe:infNFe', self.ns)
            if infNFe is None:
                validation_result["is_valid"] = False
                validation_result["missing_fields"].append("infNFe (Informações da Nota Fiscal não encontradas)")
                return validation_result
        
            # Estrutura de campos obrigatórios com mensagens descritivas
            required_fields = {
                'emit': {
                    'fields': ['CNPJ', 'xNome'],
                    'messages': {
                        'CNPJ': 'CNPJ do Remetente',
                        'xNome': 'Nome do Remetente'
                    }
                },
                'dest': {
                    'fields': ['CNPJ', 'xNome'],
                    'messages': {
                        'CNPJ': 'CNPJ do Destinatário',
                        'xNome': 'Nome do Destinatário'
                    }
                },
                'enderEmit': {
                    'fields': ['xLgr', 'nro', 'xBairro', 'xMun', 'UF', 'CEP'],
                    'messages': {
                        'xLgr': 'Logradouro do Remetente',
                        'nro': 'Número do Remetente',
                        'xBairro': 'Bairro do Remetente',
                        'xMun': 'Município do Remetente',
                        'UF': 'UF do Remetente',
                        'CEP': 'CEP do Remetente'
                    }
                },
                'enderDest': {
                    'fields': ['xLgr', 'nro', 'xBairro', 'xMun', 'UF', 'CEP'],
                    'messages': {
                        'xLgr': 'Logradouro do Destinatário',
                        'nro': 'Número do Destinatário',
                        'xBairro': 'Bairro do Destinatário',
                        'xMun': 'Município do Destinatário',
                        'UF': 'UF do Destinatário',
                        'CEP': 'CEP do Destinatário'
                    }
                },
                'ide': {
                    'fields': ['nNF'],
                    'messages': {
                        'nNF': 'Número da Nota Fiscal'
                    }
                }
            }
            
            # Verifica cada grupo de campos
            for section, config in required_fields.items():
                base_element = self._find_with_ns(infNFe, section)
                
                if base_element is None:
                    validation_result["is_valid"] = False
                    validation_result["missing_fields"].append(f"Seção {section} não encontrada")
                    continue
                
                for field in config['fields']:
                    field_element = self._find_with_ns(base_element, field)
                    if field_element is None or not field_element.text:
                        validation_result["is_valid"] = False
                        field_message = config['messages'].get(field, field)
                        validation_result["missing_fields"].append(
                            f"Campo {field_message} não encontrado ou vazio"
                        )
            
            return validation_result
            
        except ET.ParseError:
            validation_result["is_valid"] = False
            validation_result["missing_fields"].append("Erro ao processar XML: formato inválido")
            return validation_result
        except Exception as e:
            validation_result["is_valid"] = False
            validation_result["missing_fields"].append(f"Erro inesperado: {str(e)}")
            return validation_result

    def extract_data(self) -> Dict[str, Any]:
        """Extrai os dados relevantes do XML da NFe"""
        try:
            print("Iniciando extração de dados...")
            
            # Verifica se root é válido
            if not isinstance(self.root, ET.Element):
                raise ValueError(f"Root inválido: {type(self.root)}")
            
            # Encontra elementos principais
            nfe = self.root.find('.//nfe:NFe', self.ns)
            if nfe is None:
                print("NFe não encontrada")
                raise ValueError("NFe não encontrada no XML")
            
            infNFe = nfe.find('.//nfe:infNFe', self.ns)
            if infNFe is None:
                print("infNFe não encontrada")
                raise ValueError("infNFe não encontrada no XML")

            # Função auxiliar para extrair texto
            def get_text(element: Optional[ET.Element], path: str) -> str:
                if element is None:
                    print(f"Elemento None para path: {path}")
                    return ''
                el = self._find_with_ns(element, path)
                if el is None:
                    print(f"Elemento não encontrado para path: {path}")
                    return ''
                return el.text if el is not None and el.text else ''

            # Busca o elemento ide separadamente
            ide = self._find_with_ns(infNFe, 'ide')
            numero_nf = get_text(ide, 'nNF') if ide is not None else ''

            # Extrair a chave de acesso
            chave_acesso = infNFe.attrib.get('Id', '').replace('NFe', '') if infNFe is not None else ''

            # Extrai dados com verificações
            emit = self._find_with_ns(infNFe, 'emit')
            if emit is None:
                print("Emitente não encontrado")
                raise ValueError("Emitente não encontrado")
            
            enderEmit = self._find_with_ns(emit, 'enderEmit')
            if enderEmit is None:
                print("Endereço do emitente não encontrado")
                raise ValueError("Endereço do emitente não encontrado")

            dest = self._find_with_ns(infNFe, 'dest')
            if dest is None:
                print("Destinatário não encontrado")
                raise ValueError("Destinatário não encontrado")
            
            enderDest = self._find_with_ns(dest, 'enderDest')
            if enderDest is None:
                print("Endereço do destinatário não encontrado")
                raise ValueError("Endereço do destinatário não encontrado")

            # Extrai dados do transporte (opcional)
            transp = self._find_with_ns(infNFe, 'transp')
            vol = None if transp is None else self._find_with_ns(transp, 'vol')

            # Valores default para transporte
            volume = 1
            peso_bruto = 0.0
            
            if vol is not None:
                volume_text = get_text(vol, 'qVol')
                peso_text = get_text(vol, 'pesoB')
                try:
                    volume = int(volume_text) if volume_text else 1
                    peso_bruto = float(peso_text) if peso_text else 0.0
                except (ValueError, TypeError) as e:
                    print(f"Erro ao converter valores de transporte: {e}")
                    volume = 1
                    peso_bruto = 0.0

            # Monta o resultado
            result = {
                "numeroNF": numero_nf,
                "chaveAcesso": chave_acesso,
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
                    "volume": volume,
                    "pesoBruto": peso_bruto
                }
            }

            print("Dados extraídos com sucesso")
            return result

        except Exception as e:
            print(f"Erro na extração de dados: {str(e)}")
            raise ValueError(f"Erro ao extrair dados: {str(e)}")

async def process_xml_files(files: List[UploadFile]) -> Dict[str, Any]:
    """
    Processa múltiplos arquivos XML
    Args:
        files: Lista de arquivos XML para processar
    Returns:
        Dict contendo dados processados e erros de validação
    """
    if not isinstance(files, list):
        return {
            "processed_data": [],
            "validation_errors": {"error": ["Entrada inválida: esperada uma lista de arquivos"]}
        }

    if not files:
        return {
            "processed_data": [],
            "validation_errors": {"error": ["Nenhum arquivo foi enviado"]}
        }

    results = {
        "processed_data": [],
        "validation_errors": {}
    }
    
    try:
        for file in files:
            try:
                # Verifica se o arquivo é válido
                if not hasattr(file, 'filename') or not hasattr(file, 'read'):
                    results["validation_errors"]["error"] = ["Arquivo inválido"]
                    continue

                # Lê o conteúdo do arquivo
                content = await file.read()
                if not content:
                    results["validation_errors"][file.filename] = ["Arquivo vazio"]
                    continue

                # Tenta diferentes encodings
                for encoding in ['utf-8', 'latin1', 'cp1252']:
                    try:
                        xml_content = content.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    results["validation_errors"][file.filename] = ["Não foi possível decodificar o arquivo"]
                    continue

                # Processa o XML
                try:
                    processor = NFXMLProcessor(xml_content)
                    validation = processor.validate()
                    
                    if not validation["is_valid"]:
                        results["validation_errors"][file.filename] = validation["missing_fields"]
                        continue
                    
                    data = processor.extract_data()
                    # Adiciona um ID único para cada nota fiscal
                    data["id"] = f"nf_{data['numeroNF']}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    results["processed_data"].append(data)
                    
                except ValueError as e:
                    results["validation_errors"][file.filename] = [str(e)]
                except Exception as e:
                    results["validation_errors"][file.filename] = [f"Erro ao processar XML: {str(e)}"]
                    
            except Exception as e:
                results["validation_errors"][file.filename] = [f"Erro ao processar arquivo: {str(e)}"]
            finally:
                await file.seek(0)

        return results

    except Exception as e:
        print(f"Erro geral no processamento: {str(e)}")
        raise ValueError(f"Erro no processamento dos arquivos: {str(e)}") 
import time
import requests
import PyPDF2
import logging
from flask import Flask, send_file, jsonify, request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from urllib.parse import urlparse, unquote
from io import BytesIO

app = Flask(__name__)

# Configuração do logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("buscado.log", encoding='utf-8')
    ]
)

def configurar_driver():
    """Configura e retorna uma instância do driver Selenium em headless mode"""
    options = Options()
    options.add_argument("-headless")
    return webdriver.Firefox(options=options)

def obter_url_pdf(driver):
    """Obtém a URL do PDF mais recente do Diário Oficial"""
    try:
        driver.get("https://www.doweb.novaiguacu.rj.gov.br/portal/diario-oficial")
        driver.find_element(By.XPATH, "/html/body/div[3]/div/div[1]/div[3]/div[1]/div[2]/div[2]/div[6]/a[2]").click()
        time.sleep(5)
        driver.switch_to.window(driver.window_handles[1])
        return driver.current_url
    except Exception as e:
        logging.error(f"Erro ao acessar o site: {e}")
        return None

@app.route('/dorecente', methods=['GET'])
def download_recente():
    """Endpoint para download do PDF mais recente"""
    driver = configurar_driver()
    try:
        pdf_url = obter_url_pdf(driver)
        if not pdf_url:
            return jsonify({"error": "Falha ao obter URL do PDF"}), 500

        # Faz o download do conteúdo do PDF
        response = requests.get(pdf_url)
        response.raise_for_status()
        
        # Prepara o arquivo para download
        nome_arquivo = unquote(urlparse(pdf_url).path.split('/')[-1])  # Linha corrigida
        
        return send_file(
            BytesIO(response.content),
            as_attachment=True,
            download_name=nome_arquivo,
            mimetype='application/pdf'
        )
    except Exception as e:
        logging.error(f"Erro no endpoint /dorecente: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        driver.quit()

@app.route('/dobusca', methods=['GET'])
def busca_nome():
    """Endpoint para busca de nome no PDF recente"""
    nome = request.args.get('nome')
    if not nome:
        return jsonify({"error": "Parâmetro 'nome' não fornecido"}), 400
    
    driver = configurar_driver()
    try:
        pdf_url = obter_url_pdf(driver)
        if not pdf_url:
            return jsonify({"error": "Falha ao obter URL do PDF"}), 500

        # Faz o download do conteúdo do PDF
        response = requests.get(pdf_url)
        response.raise_for_status()
        pdf_content = response.content

        # Processa o PDF em memória
        paginas_encontradas = []
        with BytesIO(pdf_content) as pdf_stream:
            leitor = PyPDF2.PdfReader(pdf_stream)
            for idx, pagina in enumerate(leitor.pages):
                texto = pagina.extract_text()
                if texto and (nome.lower() in texto.lower()):
                    paginas_encontradas.append(idx + 1)

        return jsonify({
            "nome": nome,
            "encontrado": len(paginas_encontradas) > 0,
            "paginas": paginas_encontradas,
            "pdf_nome": unquote(urlparse(pdf_url).path.split('/')[-1]),
            "pdf_url": pdf_url
        })
    except Exception as e:
        logging.error(f"Erro no endpoint /dobusca: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        driver.quit()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

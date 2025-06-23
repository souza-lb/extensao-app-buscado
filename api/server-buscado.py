import time
import requests
import PyPDF2
import logging
import os
import json
from flask import Flask, send_file, jsonify, request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from urllib.parse import urlparse, unquote
from io import BytesIO
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

app = Flask(__name__)

# Configurações
CACHE_DIR = "cache"
RECENT_FILE = os.path.join(CACHE_DIR, "recente.txt")
STATUS_FILE = os.path.join(CACHE_DIR, "status.json")
SCHEDULE_TIMES = ["08:00", "12:00", "16:00", "20:00"]  # Horários de verificação

# Configuração do logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("buscado.log", encoding='utf-8')
    ]
)

# Cria a pasta de cache se não existir
os.makedirs(CACHE_DIR, exist_ok=True)

# Estado do serviço
service_status = {
    "ultima_atualizacao": None,
    "proxima_atualizacao": None,
    "do_mais_recente": None,
    "url_mais_recente": None
}

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

def baixar_e_salvar_pdf(url):
    """Baixa o PDF e salva na pasta de cache"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Extrai o nome do arquivo da URL
        nome_arquivo = unquote(urlparse(url).path.split('/')[-1])
        caminho_arquivo = os.path.join(CACHE_DIR, nome_arquivo)
        
        with open(caminho_arquivo, 'wb') as f:
            f.write(response.content)
        
        return nome_arquivo, url
    except Exception as e:
        logging.error(f"Erro ao baixar/salvar PDF: {e}")
        return None, None

def verificar_e_atualizar_recente():
    """Verifica e atualiza o DO mais recente se necessário"""
    global service_status
    logging.info("Iniciando verificação agendada do DO mais recente")
    
    # Sempre atualiza o timestamp da última verificação
    service_status["ultima_atualizacao"] = datetime.now().isoformat()
    
    driver = configurar_driver()
    try:
        pdf_url = obter_url_pdf(driver)
        if not pdf_url:
            logging.error("Não foi possível obter a URL do PDF")
            return
        
        # Extrai o nome do arquivo da URL
        nome_arquivo = unquote(urlparse(pdf_url).path.split('/')[-1])
        
        # Verifica se o arquivo já existe
        caminho_arquivo = os.path.join(CACHE_DIR, nome_arquivo)
        if os.path.exists(caminho_arquivo):
            logging.info(f"O DO mais recente já está em cache: {nome_arquivo}")
            
            # Atualiza o registro do mais recente mesmo que já exista
            service_status["do_mais_recente"] = nome_arquivo
            service_status["url_mais_recente"] = pdf_url
        else:
            # Baixa e salva o novo arquivo
            nome_arquivo, pdf_url = baixar_e_salvar_pdf(pdf_url)
            if nome_arquivo:
                logging.info(f"Novo DO baixado e salvo: {nome_arquivo}")
                
                # Atualiza o registro do mais recente
                service_status["do_mais_recente"] = nome_arquivo
                service_status["url_mais_recente"] = pdf_url

        # Salva o status após qualquer verificação
        with open(RECENT_FILE, 'w') as f:
            f.write(json.dumps({
                "nome_arquivo": service_status["do_mais_recente"],
                "url": service_status["url_mais_recente"],
                "data_atualizacao": service_status["ultima_atualizacao"]
            }))

    except Exception as e:
        logging.error(f"Erro na verificação do DO recente: {e}")
    finally:
        driver.quit()
    
    # Agenda próxima atualização
    proxima_atualizacao = datetime.now() + timedelta(hours=6)
    service_status["proxima_atualizacao"] = proxima_atualizacao.isoformat()
    
    # Salva o status completo
    with open(STATUS_FILE, 'w') as f:
        json.dump(service_status, f)
    
    logging.info(f"Próxima verificação agendada para: {proxima_atualizacao}")

def agendar_atualizacoes():
    """Agenda as verificações periódicas do DO mais recente"""
    scheduler = BackgroundScheduler()
    
    # Agenda verificações nos horários definidos
    for hora in SCHEDULE_TIMES:
        h, m = hora.split(':')
        scheduler.add_job(
            verificar_e_atualizar_recente,
            'cron',
            hour=int(h),
            minute=int(m)
        )
    
    scheduler.start()
    logging.info(f"Agendamentos configurados para: {', '.join(SCHEDULE_TIMES)}")
    
    # Calcula a próxima atualização
    agora = datetime.now()
    for hora in sorted(SCHEDULE_TIMES):
        h, m = map(int, hora.split(':'))
        horario = agora.replace(hour=h, minute=m, second=0, microsecond=0)
        if horario > agora:
            service_status["proxima_atualizacao"] = horario.isoformat()
            break
    else:
        # Se todos os horários já passaram, usa o primeiro horário do dia seguinte
        primeira_hora = SCHEDULE_TIMES[0].split(':')
        horario = agora.replace(hour=int(primeira_hora[0]), 
                              minute=int(primeira_hora[1]), 
                              second=0, 
                              microsecond=0) + timedelta(days=1)
        service_status["proxima_atualizacao"] = horario.isoformat()
    
    # Salva o status inicial
    with open(STATUS_FILE, 'w') as f:
        json.dump(service_status, f)

# Tenta carregar o status anterior
try:
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, 'r') as f:
            service_status = json.load(f)
        logging.info("Status anterior carregado")
except Exception as e:
    logging.error(f"Erro ao carregar status: {e}")

# Tenta carregar o DO mais recente
try:
    if os.path.exists(RECENT_FILE):
        with open(RECENT_FILE, 'r') as f:
            recent_data = json.load(f)
            service_status["do_mais_recente"] = recent_data.get("nome_arquivo")
            service_status["url_mais_recente"] = recent_data.get("url")
            service_status["ultima_atualizacao"] = recent_data.get("data_atualizacao")
        logging.info(f"DO recente carregado: {service_status['do_mais_recente']}")
except Exception as e:
    logging.error(f"Erro ao carregar DO recente: {e}")

# Inicia o agendador
agendar_atualizacoes()

# Executa a primeira verificação imediatamente
verificar_e_atualizar_recente()

@app.route('/dorecente', methods=['GET'])
def download_recente():
    """Endpoint para download do PDF mais recente"""
    if not service_status.get("do_mais_recente"):
        return jsonify({"error": "Nenhum DO recente disponível"}), 404
    
    try:
        caminho_arquivo = os.path.join(CACHE_DIR, service_status["do_mais_recente"])
        return send_file(
            caminho_arquivo,
            as_attachment=True,
            download_name=service_status["do_mais_recente"],
            mimetype='application/pdf'
        )
    except Exception as e:
        logging.error(f"Erro no endpoint /dorecente: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/dobusca', methods=['GET'])
def busca_nome():
    """Endpoint para busca de nome no PDF recente"""
    nome = request.args.get('nome')
    if not nome:
        return jsonify({"error": "Parâmetro 'nome' não fornecido"}), 400
    
    if not service_status.get("do_mais_recente"):
        return jsonify({"error": "Nenhum DO recente disponível"}), 404
    
    try:
        caminho_arquivo = os.path.join(CACHE_DIR, service_status["do_mais_recente"])
        paginas_encontradas = []
        
        with open(caminho_arquivo, 'rb') as f:
            leitor = PyPDF2.PdfReader(f)
            for idx, pagina in enumerate(leitor.pages):
                texto = pagina.extract_text()
                if texto and (nome.lower() in texto.lower()):
                    paginas_encontradas.append(idx + 1)
        
        return jsonify({
            "nome": nome,
            "encontrado": len(paginas_encontradas) > 0,
            "paginas": paginas_encontradas,
            "pdf_nome": service_status["do_mais_recente"],
            "pdf_url": service_status["url_mais_recente"]
        })
    except Exception as e:
        logging.error(f"Erro no endpoint /dobusca: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    """Endpoint para status do serviço"""
    return jsonify({
        "do_mais_recente": service_status.get("do_mais_recente"),
        "url_mais_recente": service_status.get("url_mais_recente"),
        "ultima_atualizacao": service_status.get("ultima_atualizacao", "Nunca"),
        "proxima_atualizacao": service_status.get("proxima_atualizacao", "Não agendada")
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

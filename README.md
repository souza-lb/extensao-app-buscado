<h1 align=center>Projeto de Extensão AppBuscaDO</h1>

<b>Projeto de Extensão da Disciplina Programação pada Disposistivos Móveis em Android - Leonardo Bruno de Souza Silva - 202301011744 - Arquivos da Aplicação e Servidor.</b>

<b>Repositório Pricipal do Projeto BuscaDO</b>

<b>Ambiente de desenvolvimento básico do projeto com a utilização do OpenJDK17, Maven, Node v22.14.0, Expo SDK 52</b>

Este repositório fornece:

* index.tsx: Arquivo principal do App. Concentra toda a lógica das telas e deve ficar dentro da pasta /app do projeto.

* app.json: Arquivo com configurações adicionais do projeto.

* package.json: Depêndencias projeto React Native para execução do aplicativo móvel.

* server-buscado.py: Arquivo com backend da aplicação (pasta api). Fornece a api para consumo pelo aplicativo móvel (endpoints)

* requisitos-python.txt: Arquivo com requisitos para rodar api python (backend) 

Para criar o ambiente você vai precisar basicamente de:

* GNU Linux Debian 12.10.0
* OpenJDK17
* Node v22.14.0
* Gecko Driver Linux amd64
* Git 2.39.2 ( ou superior) opcional
* Expo SDK 52
* Python 3.11.2 (ou superior) para execução do backend (api)

Sistema Operacional Utilizado:  GNU/Linux Debian 12.10.0


O que essa aplicação faz?
Ela permite o monitoramento através buscas automatizadas e agendadas em arquivos do Diário Oficial da Prefeitura de Nova Iguaçu.

Como ela funciona?
Uma aplicação construida com React Native (Expo SDK 52) consome um a api construída em python. 
Dois endpoints são a base do aplicativo fornecendo arquivos e resultados para consumo no app móvel.


<h2>Principais Telas do Projeto em Uso:</h2>

Tela DO Atual

<img src="/imagens/tela-do-atual.jpeg" alt="tela inicial" style="width: 30%; height: auto;">

Download arquivo 

<img src="/imagens/tela-arquivo.jpeg" alt="tela inicial" style="width: 30%; height: auto;">

Tela para busca de nome  

<img src="/imagens/tela-busca.jpeg" alt="tela inicial" style="width: 30%; height: auto;">

Tela Agendamento  

<img src="/imagens/tela-agendamento.jpeg" alt="tela inicial" style="width: 30%; height: auto;">

Notificação de agendamento e resultado  

<img src="/imagens/notificações.jpeg" alt="tela inicial" style="width: 30%; height: auto;">  
  

Servidor Backend (API)  

![backend](/imagens/tela-backend.png)

Tela Expo  

![tela expo](/imagens/tela-expo.png)  


Este repositório foi criado por: <b>Leonardo Bruno de Souza Silva</b><br>
<b>Matrícula 202301011744</b><br>
<b>Projeto de Extensão AppBuscaDO da Disciplina Programação pada Disposistivos Móveis em Android </b><br>
202301011744@alunos.estacio.br<br>
<b>souzalb@proton.me</b>


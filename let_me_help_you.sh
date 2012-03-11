#!/bin/bash

JWSDIR="./CoopServer/libs"

function setup(){
	echo "Let me do the setup part for you ..."
	echo "Deleting ${JWSDIR} "
	rm -rf ${JWSDIR}
	echo "Downloading jwebsocket to here"
	wget http://jwebsocket.googlecode.com/files/jWebSocketServer-1.0-nb20105.zip -O ./jwebsocket_server.zip
	echo "Creating ${JWSDIR} "
	mkdir ${JWSDIR} -p
	echo "Unpacking our libs"
	unzip ./jwebsocket_server.zip -d ${JWSDIR}
	echo "Cleaning up ..."
	rm ./jwebsocket_server.zip
	echo "Adding JWebSocketHome"
	export JWEBSOCKET_HOME="${JWSDIR}/jWebSocket-1.0"
	echo "Done"
}

function build(){
	stop
	echo "Let's build our bad-ass server!"
	export JWEBSOCKET_HOME="${JWSDIR}/jWebSocket-1.0"
	echo "Deleting old bins"
	rm -rf CoopServer/console_build
	echo "Creating console_build directory"
	mkdir -p CoopServer/console_build
	echo "running javac"
	javac -classpath ${JWSDIR}/jWebSocket-1.0/libs/jWebSocketServer-1.0.jar:CoopServer/src -d CoopServer/console_build CoopServer/src/server/cooproject/itk/hu/*.java
	echo "done"
}

function run(){
	stop
	echo "Starting server"
	export JWEBSOCKET_HOME="${JWSDIR}/jWebSocket-1.0"
	java -classpath CoopServer/console_build:${JWSDIR}/jWebSocket-1.0/libs/jWebSocketServer-1.0.jar org.jwebsocket.console.JWebSocketServer -config `pwd`/config/serverConfig.xml &
}

function update(){
	stop
	echo "Attempting to update from git origin, whatever that may be"
	git pull origin serverside
	echo "Done. run build to compile."
}

function stop(){
	echo "Stopping anything listening on 8787..."
	fuser -k 8787/tcp
	echo "done"
}

if [[ $1 == "setup" ]];
then
	setup
elif [[ $1 == "build" ]];
then
	build
elif [[ $1 == "run" ]];
then
	run
elif [[ $1 == "stop" ]];
then
	stop
elif [[ $1 == "update" ]];
then
	update
else
	echo "missing argument setup/build/run"
fi


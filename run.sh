#!/bin/bash

# make sure we can sudo
sudo ps -A|grep java

# 1. Java-Programm im Hintergrund starten und PID speichern
echo "Starte Elexis-Konverter im Hintergrund..."
java -jar elexis_converter_5.0.2.jar &
JAVA_PID=$! # Speichert die Prozess-ID (PID) des zuletzt gestarteten Hintergrundprozesses

sleep 2

# 2. AppArmor-Beschränkung für User Namespaces aufheben (0 = deaktiviert/gelockert)
echo "Lockere AppArmor-Beschränkung..."
echo 0 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns

sleep 2


# 3. Exporter ausführen
echo "Führe Exporter-Programm aus..."
# Die Argumente $1 und $2 werden an das Node-Skript weitergegeben
node dist/index.js $1 $2 $3 $4

# Warte, bis das Node-Programm beendet ist (es läuft im Vordergrund)
NODE_EXIT_CODE=$?
echo "Node-Programm beendet mit Exit-Code: $NODE_EXIT_CODE"


# 4. AppArmor-Beschränkung für User Namespaces wiederherstellen (1 = aktiviert/blockiert)
echo "Stelle AppArmor-Beschränkung wieder her..."
echo 1 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns


# 5. Das Java-Programm vom ersten Schritt stoppen
echo "Stoppe Elexis-Konverter (PID: $JAVA_PID)..."
kill "$JAVA_PID"
echo "Java-Programm gestoppt."

exit 0
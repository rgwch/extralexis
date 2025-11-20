#!/bin/bash

# make sure we can sudo
sudo ps -A|grep java

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


exit 0

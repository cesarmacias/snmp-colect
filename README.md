# snmp-colect
Colect data by SNMP, for any network element. Using a JSON as config file. Can use with logstash to send de data to ElasticSearch

Colect SNMP is writen in Node JS, have two scripts:
1. Generic - to colect data by SNMP for any device
2. Poller - Like de previus but the list of devices (targets) are receive by stdin

The structure of config file is similar from telegraf SNMP

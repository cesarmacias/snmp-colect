# snmp-colect
Is a script written in NODE JS, to collect SNMP data from any kind of network element, can collect SNMP information from thousands devices with many and different type of OID.
The JSON output is formatted to work perfectly with Logtsash to send the data to Elasticsearch.
The JSON input configuration file, has some similarities with Telegraph SNMP plugin; the object structure inherits from Influxdb, but its tested to work for 2K network devices with 30K interfaces sending the data to Elasticsearch any two minutes’ whiteout a problem or loss of data.
The use of CPU of server that run the script is very low.
We create this program in replace to use telegraph, because not work as we need in scenario of thousands devices with many OID.
Now we can do more with less CPU resources

#What Can DO
- collect data from group of OID than have the same index, like table. Example “if-mib”. 
- add inherit data form different OID to any group of data in table format. Example “hostname”, “syslocation”.
- identified the data, its added the measurement_name field with a text name, like a table name in databases.
Example:
measurement_name; ifAlias; ifName; ifInOctects; hostname; agent_host; 
snmpif; to_router2; Gig 1/0/0; 12903250; router1; 192.168.0.1
snmpif; to_router1; Gig 1/0/0; 14905250; router2; 192.168.0.2
- work with SNMP v1 and v2c
- separate the data in two objects “field” and “tag”, this is useful when in the index of Elasticsearch you make all field.X as not index data and all tag.X indexed.
Example: the ifinoctecs that are a counter and is not useful to index and has a cost of disk the action of index.


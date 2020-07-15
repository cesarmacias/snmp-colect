# snmp-colect
Is a script written in NODE JS, to collect SNMP data from any kind of network element, can collect SNMP information from thousands devices with many and different type of OID.
The JSON output is formatted to work perfectly with Logtsash to send the data to Elasticsearch.
The JSON input configuration file, has some similarities with Telegraph SNMP plugin; the object structure inherits from Influxdb, but its tested to work for 2K network devices with 30K interfaces sending the data to Elasticsearch in two minutes, whiteout a problem or loss of data.
The use of CPU of server that run the script is very low.
We create this program in replace to use telegraph, because not work as we need in scenario of thousands devices with many OID.
Now we can do more with less CPU resources

# What Can DO
- collect data from group of OID than have the same index, like table. Example “if-mib”. 
- add inherit data form different OID to any group of data in table format. Example “hostname”, “syslocation”.
- identified the data, its added the measurement_name field with a text name, like a table name in databases.
- work with SNMP v1 and v2c
- separate the data in two objects “field” and “tag”, this is useful when in the index of Elasticsearch you make all field.X as not index data and all tag.X indexed.
Example: the ifHCInOctets (if-mib) that are a counter and is not useful to index and has a cost of disk the index action.

# Cnfiguration JSON File
The configuration input file are divided in:
- Information of hosts and SNMP options.
- Inherit OIDS, OIDS with only one response that will be repeted in all responses from tables (example hostname)
- Tables, OIDS that have the same INDEX like if-mib, can configure many tables any table with especifict measurement.
- OIDS_GET, OIDS that response only one value, can parse STRING into multiple object usin a REGEX.
- poller-cm.js: OIDS_WALK, OIDS that response many values, store the results in array.

Examples:
- conf/conf_table.json -> multiple OID/Table for 2 devices
- conf/conf_getinfo.json -> get many simple values for 2 devices
- conf/cable_modems.json -> config file for HFC CableModems, script poller-cm.js

# Execution

- Collect data from list of equips 
    node poller.js --config=conf/conf.json

- Collect data from HFC CMTS / Cable Modems
    node poller.js --config=conf/conf_cmts.json | poller-cm.js --config=conf/conf_cm.json

# Roadmap

Version 1.0:
- list of hosts by file
- suport octect 64bits
- multiple tables
- inherit data to all tables
- suport HEX OCTECTSTING
- OID type get, with response STRING cab be parsed to many objects by REGEX (typical use SYSDESCRIP)

Version 1.1:
- add convert ipv4 from hex or integer to string
- poller-cm.js support snmpwalk OID to array


Requests:
- list of hosts can be a SQL to database
- list of hosts can be stdin (to execute from result of another script)

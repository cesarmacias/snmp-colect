# snmp-colect
Is a script written in NODE JS, to collect SNMP data from any kind of network element, can collect SNMP information from thousands devices with many and different type of OID.
The JSON output is formatted to work perfectly with Logtsash to send the data to Elasticsearch.
The JSON input configuration file, has some similarities with Telegraph SNMP plugin; the object structure inherits from Influxdb, but its tested to work for 2K network devices with 30K interfaces sending the data to Elasticsearch any two minutes’ whiteout a problem or loss of data.
The use of CPU of server that run the script is very low.
We create this program in replace to use telegraph, because not work as we need in scenario of thousands devices with many OID.
Now we can do more with less CPU resources

# What Can DO
- collect data from group of OID than have the same index, like table. Example “if-mib”. 
- add inherit data form different OID to any group of data in table format. Example “hostname”, “syslocation”.
- identified the data, its added the measurement_name field with a text name, like a table name in databases.
- work with SNMP v1 and v2c
- separate the data in two objects “field” and “tag”, this is useful when in the index of Elasticsearch you make all field.X as not index data and all tag.X indexed.
Example: the ifinoctecs that are a counter and is not useful to index and has a cost of disk the action of index.

# Cnfiguration JSON File
The configuration input file are divided in:
- Information of hosts and SNMP options.
- Inherit OIDS, OIDS with only one response that will be repeted in all responses from tables (example hostname)
- Tables, OIDS that have the same INDEX like if-mib, can configure many tables any table with especifict measurement.
- OIDS_GET, OIDS that response only one value, can parse STRING into multiple object usin a REGEX.

Examples:
- conf/conf.json -> simple ifmib for 2 devices

# Roadmap

Version 0.1 (master):
- list of hosts by file
- suport octect 64bits
- multiple tables
- inherit data to all tables
- suport HEX OCTECTSTING
- OID type get, with response STRING cab be parsed to many objects by REGEX (typical use SYSDESCRIP)

Requests:
- list of hosts can be a SQL to database
- list of hosts can be stdin (to execute from result of another script)

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
// List of hosts
"hosts": [ "192.168.0.1", "192.168.0.2" ],
// SNMP comunity to all hosts
  "community": "PUBLIC",
// SNMP options
  "options": {
    "version": "2c",
    "retries": 5,
    "timeout": 1000,
    "port": 161
  },
  //OID that need to inherit in all data to all measurments 
  "inh_oids": {
    "1.3.6.1.2.1.1.5.0": "hostname",
    "1.3.6.1.2.1.1.6.0": "syslocation"
  },
  "table": [
    {
      "options": {
        "measurement": "snmpif",
        "index": true, // add pollertime EPOCH
        "time": true //add index of OID
      },
      "oids": [
        {
          "name": "ifName",
          "oid": "1.3.6.1.2.1.31.1.1.1.1",
          "tag": true
        },
        {
          "name": "ifAlias",
          "oid": "1.3.6.1.2.1.31.1.1.1.18",
          "tag": true
        },
        {
          "name": "ifSpeed",
          "oid": "1.3.6.1.2.1.31.1.1.1.15"
        },
        {
          "name": "ifHCInOctets",
          "oid": "1.3.6.1.2.1.31.1.1.1.6"
        }
       ]
     }
   ]

Example Result (two routers with 1 interface):
measurement_name; tag.ifAlias; tag.ifName; field.ifHCInOctets; field.ifSpeed ;hostname; agent_host; index; pollertime
snmpif; to_router2; Gig 1/0/0; 12903250; 10000; router1; 192.168.0.1; 100; 1581369703
snmpif; to_router1; Gig 1/0/0; 14905250; 10000; router2; 192.168.0.2; 101; 1581369703

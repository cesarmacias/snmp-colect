# SNMP-COLECT

Is a script written in NODE JS, to collect SNMP data from any kind of network element, can collect SNMP information from thousands of devices with many and different types of OID.
The JSON output is formatted to work perfectly with Logtsash to send the data to Elasticsearch.
The JSON input configuration file has some similarities with the Telegraph SNMP plugin; the object structure inherits from Telegraf, but it is tested to work for 2K network devices with 30K interfaces sending the data to Elasticsearch in less than a minute, whiteout a problem or loss of data.
The use of the CPU of the server that runs the script is very low.
We create this program replace to the use of the Telegraph, because not work as we need in scenarios of thousands of devices with many OID.
Now we can do more with fewer CPU resources

## What Can DO

- collect data from a group of OID and then have the same index, like a table. Example “if-mib”.
- add inherit data from different OID to any group of data in table format. Example “hostname”, “syslocation”.
- identified the data, its added the measurement_name field with a text name, like a table name in databases.
- work with SNMP versions 1,  2c and 3
- separate the data into two objects “field” and “tag”, this is useful when in the index of Elasticsearch you make all "field.X" as not index data and all "tag.X" indexed.
Example: the ifHCInOctets (if-mib) that are a counter and are not useful to index and have a cost of disk this index action.
- poller-cm.js have a filter of OID config using OUI of MAC, because its used for HFC cable modems

## Cnfiguration JSON File

>The configuration input file is divided in:

- Information about hosts and SNMP options.
- Inherit OIDS, OIDS with only one response that will be repeated in all responses from tables (example hostname)
- Tables, OIDS that have the same INDEX like if-mib, can configure many tables in any table with specific measurement.
- OIDS_GET, OIDS that responds to only one value, can parse STRING into multiple objects using a REGEX.
- OIDS_WALK, OIDS that responds to many values, stores the results in an array.

>Examples:

- examples/conf_table.json -> multiple OID/Table for 2 devices
- examples/conf_getinfo.json -> get many simple values for 2 devices
- examples/config_dbconect.json -> get info from a list provided by a database
- examples/cable_modems.json -> config file for HFC CableModems. poller-cm.js
- examples/vendor-list.json -> config for vendors OUI MAC, to filter OIDs to the poller. poller-cm.js

>Data processing:

Configuration inside of OID context:

- "type": [ hex, regex ] transform value in hex to string or split the result using a regular expression, has to define "regex"
- "conversion": [ ipv4, number ] transform value in ipv4 or number
- "index_slice": [ int, int ] apply slice function to oid index (only for table)
- "regex": a string of regular expressions to use
- "map": array of name of fields result of regex conversion using the $ positions
- "split": define the split string to split the string result in an array

## Execution

- Collect data from a list of equips
    node poller.js --config=conf/conf.json

- Collect data from HFC CMTS / Cable Modems
    node poller.js --config=conf/conf_cmts.json | poller-cm.js --config=conf/conf_cm.json

## Release Notes

Version 1.0:

- list of hosts by file
- suport octect 64bits
- multiple tables
- inherit data to all tables
- suport HEX OCTECTSTING
- OID type get, with response STRING can be parsed to many objects by REGEX (typical use SYSDESCRIP)

Version 1.1:

- add convert ipv4 from hex or integer to string
- poller-cm.js support snmpwalk OID to an array

Version 1.2:

- add convert string response to a number
- add input of list of hosts from text file, each IP by line

Version 1.3.0:

- add input list of hosts from DB connection (Mysql or MariaDB as "mysql" and PostgreSQL as "pg")
- add input list of hosts from stdin (to execute from a result of another script)
- update-modules
- remove the async module, use async/await and promises

Version 1.3.1

- minor release, a correct bug of the first field with prefix (field or tag) duplicated

Version 1.3.2

- update npm modules
- correct bugs:
  - ipiterate in database read if is in dot notation
  - add deepmerge objects
  - add snmptest a target to reduce the poller time when not responding

Version 1.3.3

- correct bugs:
  - snmptest override SNMP.options

Version 1.3.4

- Feature:
  - get_table/index_slice add slice function to index per OID in Table
  - update README

Version 1.3.5

- Feature:
  - add split function to strig response to return array, can be used with conversions

- correct bugs:
  - bug table SNMP error

Version 1.3.6

- List of hosts in a database can receive IP (ipField), Community (comField), and other attributes from SQL queries. examples/config_dbconect.json

Version 1.4

- Add support to SNMP V3
- Add use of environment variables as part config file with field "env"; an array of fields in dot notation to replace with environment variables
- examples/config_getinfoV3.json

## Requests

- unify poller.js and poller-cm.js
- add support for MongoDB
- output can be Elasticsearch directly

***

## Diagram of Use

![Alt](Diagram.svg)

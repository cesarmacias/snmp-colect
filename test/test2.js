/*jslint node: true */
"use strict";

const readline = require("readline");
const poller = require("../Poller/snmp.js");
const snmp = require("net-snmp");


const conf = {
    "maxRepetitions": 3,
    "community": "MTA521t3lm3X*wr",
    "options": {
        "version": snmp.Version2c,
        "retries": 5,
        "timeout": 1000,
        "port": 161
    }
};

const hosts = [
    "10.36.144.86"
    , "10.36.164.49"
    , "10.36.171.10"
    , "10.36.181.211"
    , "10.36.182.180"
    , "10.36.186.179"
    , "10.36.188.186"
    , "10.36.181.166"
    , "10.36.182.5"
    , "10.36.221.156"
    , "10.36.136.167"
    , "10.36.167.234"
    , "10.36.171.12"
    , "10.36.147.205"
    , "10.36.184.92"
    , "10.36.190.73"
    , "10.36.191.215"
    , "10.36.189.103"
    , "10.36.192.253"
    , "10.36.195.54"
    , "10.36.195.160"
    , "10.36.198.88"
    , "10.36.203.185"
    , "10.36.207.92"
    , "10.36.208.60"
    , "10.36.175.240"
    , "10.36.144.209"
    , "10.36.156.48"
    , "10.36.155.210"
    , "10.36.211.188"
    , "10.36.211.208"
    , "10.36.206.197"
    , "10.36.181.207"
    , "10.36.211.210"
    , "10.36.213.44"
    , "10.36.160.62"
    , "10.36.128.143"
    , "10.36.151.228"
    , "10.36.134.24"
    , "10.36.159.224"
    , "10.36.186.170"
    , "10.36.202.116"
    , "10.36.208.186"
    , "10.36.208.74"
    , "10.36.161.228"
    , "10.36.203.198"
    , "10.36.214.186"
    , "10.36.214.246"
    , "10.36.133.68"
    , "10.36.160.24"
    , "10.36.200.15"
    , "10.36.143.142"
    , "10.36.205.159"
    , "10.36.192.245"
    , "10.36.166.83"
    , "10.36.172.14"
    , "10.36.209.199"
    , "10.36.215.84"
    , "10.36.215.231"
    , "10.36.242.6"
    , "10.36.216.8"
    , "10.36.216.55"
    , "10.36.211.71"
    , "10.36.184.0"
    , "10.36.201.133"
    , "10.36.218.72"
    , "10.36.218.121"
    , "10.36.218.209"
    , "10.36.219.62"
    , "10.36.165.194"
    , "10.36.210.255"
    , "10.36.219.135"
    , "10.36.219.153"
    , "10.36.219.154"
    , "10.36.219.246"
    , "10.36.219.255"
    , "10.36.132.62"
    , "10.36.131.221"
    , "10.36.220.56"
    , "10.36.220.183"
    , "10.36.220.184"
    , "10.36.220.222"
    , "10.36.161.204"
    , "10.36.221.65"
    , "10.36.221.186"
    , "10.36.222.29"
    , "10.36.222.116"
    , "10.36.222.186"
    , "10.36.222.212"
    , "10.36.223.16"
    , "10.36.223.72"
    , "10.36.223.146"
    , "10.36.224.212"
    , "10.36.143.134"
    , "10.36.194.181"
    , "10.36.224.218"
    , "10.36.225.22"
    , "10.36.225.44"
    , "10.36.225.68"
    , "10.36.225.83"
    , "10.36.225.142"
    , "10.36.225.64"
    , "10.36.225.242"
    , "10.36.225.251"
    , "10.36.226.145"
    , "10.36.227.36"
    , "10.36.227.132"
    , "10.36.218.48"
    , "10.36.228.11"
    , "10.36.228.16"
    , "10.36.206.123"
    , "10.36.228.220"
    , "10.36.228.235"
    , "10.36.229.4"
    , "10.36.210.145"
    , "10.36.230.71"
    , "10.36.230.158"
    , "10.36.136.65"
    , "10.36.212.209"
    , "10.36.169.122"
    , "10.36.179.175"
    , "10.36.231.57"
    , "10.36.231.104"
    , "10.36.231.110"
    , "10.36.231.160"
    , "10.36.231.176"
    , "10.36.231.183"
    , "10.36.231.253"
    , "10.36.232.7"
    , "10.36.232.9"
    , "10.36.232.30"
    , "10.36.232.32"
    , "10.36.232.41"
    , "10.36.232.54"
    , "10.36.232.99"
    , "10.36.232.73"
    , "10.36.232.156"
    , "10.36.181.201"
    , "10.36.232.253"
    , "10.36.228.116"
    , "10.36.233.52"
    , "10.36.233.68"
    , "10.36.233.69"
    , "10.36.233.95"
    , "10.36.233.127"
    , "10.36.233.149"
    , "10.36.233.183"
    , "10.36.160.250"
    , "10.36.233.186"
    , "10.36.208.59"
    , "10.36.162.51"
    , "10.36.139.197"
    , "10.36.147.27"
    , "10.36.162.25"
    , "10.36.165.108"
    , "10.36.178.157"
    , "10.36.157.175"
    , "10.36.167.12"
    , "10.36.183.193"
    , "10.36.139.244"
    , "10.36.173.1"
    , "10.36.193.1"
    , "10.36.204.201"
    , "10.36.130.126"
    , "10.36.208.66"
    , "10.36.209.254"
    , "10.36.211.212"
    , "10.36.213.172"
    , "10.36.214.105"
    , "10.36.214.213"
    , "10.36.216.109"
    , "10.36.142.54"
    , "10.36.216.125"
    , "10.36.216.126"
    , "10.36.218.80"
    , "10.36.220.61"
    , "10.36.220.100"
    , "10.36.150.128"
    , "10.36.216.148"
    , "10.36.217.60"
    , "10.36.153.28"
    , "10.36.202.76"
    , "10.36.139.135"
    , "10.36.194.201"
    , "10.36.217.121"
    , "10.36.218.11"
    , "10.36.218.53"
    , "10.36.205.208"
    , "10.36.218.14"
    , "10.36.219.28"
    , "10.36.219.45"
    , "10.36.196.57"
    , "10.36.219.47"
    , "10.36.198.176"
    , "10.36.219.51"
    , "10.36.219.56"
    , "10.36.219.63"
    , "10.36.219.64"
    , "10.36.214.252"
    , "10.36.201.183"
    , "10.36.234.217"
    , "10.36.143.81"
    , "10.36.195.6"
    , "10.36.168.228"
    , "10.36.201.9"
    , "10.36.205.106"
    , "10.36.208.127"
    , "10.36.212.78"
    , "10.36.212.177"
    , "10.36.213.52"
    , "10.36.152.219"
    , "10.36.164.132"
    , "10.36.182.166"
    , "10.36.194.82"
    , "10.36.196.43"
    , "10.36.141.61"
    , "10.36.200.205"
    , "10.36.201.137"
    , "10.36.208.104"
    , "10.36.212.189"
    , "10.36.214.28"
    , "10.36.214.117"
    , "10.36.214.172"
    , "10.36.214.209"
    , "10.36.160.223"
    , "10.36.214.217"
    , "10.36.215.8"
    , "10.36.215.20"
    , "10.36.146.189"
    , "10.36.131.151"
    , "10.36.131.236"
    , "10.36.132.65"
    , "10.36.132.132"
    , "10.36.133.50"
    , "10.36.135.233"
    , "10.36.161.94"
    , "10.36.137.9"
    , "10.36.139.166"
    , "10.36.133.137"
    , "10.36.142.17"
    , "10.36.145.225"
    , "10.36.136.216"
    , "10.36.146.174"
    , "10.36.146.182"
    , "10.36.147.37"
    , "10.36.147.106"
    , "10.36.147.240"
    , "10.36.148.123"
    , "10.36.149.185"
    , "10.36.151.253"
    , "10.36.135.115"
    , "10.36.142.42"
    , "10.36.228.33"
    , "10.36.150.22"
    , "10.36.152.79"
    , "10.36.153.6"
    , "10.36.153.182"
    , "10.36.141.255"
    , "10.36.153.234"
    , "10.36.154.178"
    , "10.36.156.116"
    , "10.36.156.128"
    , "10.36.156.180"
    , "10.36.157.19"
    , "10.36.157.91"
    , "10.36.157.148"
    , "10.36.136.88"
    , "10.36.158.15"
    , "10.36.158.191"
    , "10.36.151.215"
    , "10.36.158.195"
    , "10.36.159.71"
    , "10.36.136.27"
    , "10.36.160.81"
    , "10.36.131.229"
    , "10.36.144.214"
    , "10.36.161.92"
    , "10.36.161.157"
    , "10.36.161.188"
    , "10.36.150.44"
    , "10.36.162.136"
    , "10.36.163.205"
    , "10.36.163.207"
    , "10.36.164.25"
    , "10.36.165.252"
    , "10.36.166.182"
    , "10.36.159.245"
    , "10.36.167.56"
    , "10.36.167.155"
    , "10.36.167.245"
    , "10.36.168.74"
    , "10.36.168.190"
    , "10.36.168.239"
    , "10.36.169.126"
    , "10.36.169.213"
    , "10.36.170.138"
    , "10.36.134.237"
    , "10.36.167.126"
    , "10.36.171.82"
    , "10.36.171.96"
    , "10.36.171.158"
    , "10.36.172.83"
    , "10.36.215.23"
    , "10.36.210.185"
    , "10.36.173.21"
    , "10.36.172.159"
    , "10.36.168.120"
    , "10.36.173.133"
    , "10.36.173.251"
    , "10.36.176.27"
    , "10.36.176.180"
    , "10.36.177.30"
    , "10.36.177.77"
    , "10.36.178.78"
    , "10.36.178.138"
    , "10.36.138.20"
    , "10.36.138.249"
    , "10.36.165.104"
    , "10.36.178.189"
    , "10.36.179.81"
    , "10.36.179.88"
    , "10.36.179.95"
    , "10.36.180.225"
    , "10.36.179.5"
    , "10.36.135.143"
    , "10.36.136.118"
    , "10.36.149.81"
    , "10.36.150.77"
    , "10.36.174.9"
    , "10.36.180.248"
    , "10.36.227.120"
    , "10.36.173.35"
    , "10.36.181.135"
    , "10.36.181.145"
    , "10.36.183.192"
    , "10.36.183.195"
    , "10.36.184.80"
    , "10.36.185.244"
    , "10.36.185.249"
    , "10.36.158.79"
    , "10.36.186.202"
    , "10.36.187.37"
    , "10.36.187.60"
    , "10.36.138.123"
    , "10.36.149.112"
    , "10.36.166.37"
    , "10.36.157.41"
    , "10.36.168.122"
    , "10.36.187.181"
    , "10.36.187.209"
    , "10.36.187.140"
    , "10.36.208.111"
    , "10.36.188.35"
    , "10.36.178.129"
    , "10.36.188.46"
    , "10.36.188.115"
    , "10.36.188.117"
    , "10.36.145.93"
    , "10.36.188.195"
    , "10.36.188.237"
    , "10.36.189.138"
    , "10.36.207.7"
    , "10.36.171.62"
    , "10.36.189.142"
    , "10.36.189.212"
    , "10.36.135.240"
    , "10.36.190.131"
    , "10.36.190.15"
    , "10.36.170.210"
    , "10.36.190.234"
    , "10.36.191.197"
    , "10.36.192.59"
    , "10.36.192.126"
    , "10.36.192.156"
    , "10.36.234.81"
    , "10.36.157.216"
    , "10.36.132.34"
    , "10.36.154.124"
    , "10.36.193.31"
    , "10.36.178.33"
    , "10.36.182.239"
    , "10.36.184.64"
    , "10.36.193.78"
    , "10.36.193.91"
    , "10.36.193.106"
    , "10.36.194.39"
    , "10.36.194.71"
    , "10.36.242.116"
    , "10.36.188.136"
    , "10.36.195.26"
    , "10.36.155.232"
    , "10.36.160.101"
    , "10.36.195.197"
    , "10.36.196.16"
    , "10.36.169.16"
    , "10.36.196.60"
    , "10.36.171.22"
    , "10.36.196.123"
    , "10.36.197.76"
    , "10.36.197.138"
    , "10.36.197.213"
    , "10.36.185.1"
    , "10.36.216.199"
    , "10.36.209.173"
    , "10.36.153.205"
    , "10.36.150.203"
    , "10.36.146.50"
    , "10.36.151.94"
    , "10.36.163.220"
    , "10.36.235.201"
    , "10.36.142.242"
    , "10.36.129.58"
    , "10.36.131.170"
    , "10.36.138.146"
    , "10.36.142.155"
    , "10.36.134.90"
    , "10.36.144.2"
    , "10.36.144.177"
    , "10.36.147.57"
    , "10.36.149.241"
    , "10.36.135.93"
    , "10.36.151.194"
    , "10.36.151.249"
    , "10.36.153.19"
    , "10.36.153.112"
    , "10.36.158.83"
    , "10.36.165.88"
    , "10.36.171.72"
    , "10.36.172.163"
    , "10.36.172.231"
    , "10.36.174.68"
    , "10.36.175.44"
    , "10.36.141.196"
    , "10.36.150.21"
    , "10.36.177.172"
    , "10.36.179.213"
    , "10.36.182.199"
    , "10.36.161.40"
    , "10.36.163.221"
    , "10.36.138.61"
    , "10.36.164.232"
    , "10.36.226.217"
    , "10.36.136.239"
    , "10.36.173.115"
    , "10.36.181.13"
    , "10.36.183.113"
    , "10.36.167.181"
    , "10.36.182.98"
    , "10.36.188.174"
    , "10.36.189.83"
    , "10.36.159.150"
    , "10.36.193.222"
    , "10.36.195.133"
    , "10.36.197.84"
    , "10.36.197.89"
    , "10.36.197.241"
    , "10.36.197.253"
    , "10.36.198.16"
    , "10.36.198.137"
    , "10.36.198.161"
    , "10.36.198.217"
    , "10.36.199.83"
    , "10.36.199.88"
    , "10.36.167.94"
    , "10.36.199.175"
    , "10.36.199.193"
    , "10.36.199.196"
    , "10.36.129.100"
    , "10.36.200.24"
    , "10.36.209.34"
    , "10.36.200.129"
    , "10.36.200.217"
    , "10.36.141.72"
    , "10.36.201.17"
    , "10.36.201.78"
    , "10.36.201.86"
    , "10.36.149.107"
    , "10.36.201.166"
    , "10.36.182.75"
    , "10.36.201.243"
    , "10.36.202.110"
    , "10.36.202.183"
    , "10.36.203.13"
    , "10.36.204.95"
    , "10.36.205.146"
    , "10.36.205.156"
    , "10.36.205.217"
    , "10.36.206.177"
    , "10.36.206.206"
    , "10.36.207.38"
    , "10.36.158.35"
    , "10.36.173.94"
    , "10.36.207.105"
    , "10.36.207.109"
    , "10.36.138.105"
    , "10.36.199.86"
    , "10.36.207.121"
    , "10.36.207.195"
    , "10.36.207.204"
    , "10.36.208.14"
    , "10.36.208.56"
    , "10.36.182.219"
    , "10.36.208.196"
    , "10.36.208.206"
    , "10.36.209.30"
    , "10.36.209.62"
    , "10.36.210.237"
    , "10.36.149.204"
    , "10.36.162.166"
    , "10.36.129.153"
    , "10.36.167.133"
    , "10.36.211.42"
    , "10.36.211.53"
    , "10.36.211.63"
    , "10.36.211.118"
    , "10.36.211.132"
    , "10.36.211.140"
    , "10.36.211.195"
    , "10.36.142.38"
    , "10.36.170.20"
    , "10.36.212.105"
    , "10.36.169.68"
    , "10.36.212.109"
    , "10.36.212.152"
    , "10.36.212.180"
    , "10.36.212.212"
    , "10.36.212.213"
    , "10.36.175.203"
    , "10.36.213.137"
    , "10.36.214.55"
    , "10.36.214.125"
    , "10.36.143.96"
    , "10.36.149.58"
    , "10.36.146.217"
    , "10.36.152.156"
    , "10.36.137.147"
    , "10.36.159.148"
    , "10.36.160.15"
    , "10.36.187.179"
    , "10.36.202.188"
    , "10.36.140.56"
    , "10.36.206.28"
    , "10.36.214.130"
    , "10.36.214.142"
    , "10.36.214.153"
    , "10.36.214.154"
    , "10.36.214.182"
    , "10.36.214.195"
    , "10.36.201.109"
    , "10.36.215.77"
    , "10.36.215.82"
    , "10.36.215.87"
    , "10.36.215.95"
    , "10.36.215.107"
    , "10.36.215.150"
    , "10.36.215.240"
    , "10.36.216.14"
    , "10.36.205.251"
    , "10.36.216.62"
    , "10.36.212.103"
    , "10.36.216.144"
    , "10.36.216.218"
    , "10.36.217.83"
    , "10.36.217.97"
    , "10.36.217.165"
    , "10.36.217.235"
    , "10.36.208.35"
    , "10.36.146.3"
    , "10.36.184.179"
    , "10.36.145.255"
    , "10.36.137.244"
    , "10.36.168.54"
    , "10.36.205.221"
    , "10.36.200.199"
    , "10.36.218.2"
    , "10.36.218.16"
    , "10.36.172.145"
    , "10.36.169.120"
    , "10.36.172.50"
    , "10.36.128.150"
    , "10.36.178.207"
    , "10.36.185.68"
    , "10.36.197.65"
    , "10.36.203.92"
    , "10.36.174.143"
    , "10.36.215.109"
    , "10.36.215.234"
    , "10.36.216.43"
    , "10.36.131.42"
    , "10.36.158.213"
    , "10.36.218.86"
    , "10.36.218.103"
    , "10.36.161.93"
    , "10.36.208.252"
    , "10.36.210.9"
    , "10.36.218.161"
    , "10.36.218.163"
    , "10.36.218.179"
    , "10.36.153.147"
    , "10.36.218.197"
    , "10.36.218.206"
    , "10.36.218.216"
    , "10.36.132.242"
    , "10.36.150.78"
    , "10.36.138.124"
    , "10.36.138.92"
    , "10.36.219.59"
    , "10.36.219.69"
    , "10.36.219.71"
    , "10.36.219.83"
    , "10.36.219.85"
    , "10.36.219.96"
    , "10.36.219.97"
    , "10.36.138.22"
    , "10.36.138.42"
    , "10.36.166.23"
    , "10.36.204.135"
    , "10.36.171.55"
    , "10.36.202.241"
    , "10.36.219.101"
    , "10.36.219.124"
    , "10.36.219.168"
    , "10.36.136.129"
    , "10.36.146.30"
    , "10.36.142.87"
    , "10.36.144.154"
    , "10.36.167.33"
    , "10.36.180.80"
    , "10.36.203.165"
    , "10.36.217.252"
    , "10.36.219.200"
    , "10.36.219.225"
    , "10.36.157.149"
    , "10.36.168.152"
    , "10.36.129.217"
    , "10.36.145.218"
    , "10.36.137.135"
    , "10.36.170.132"
    , "10.36.219.231"
    , "10.36.219.233"
    , "10.36.153.94"
    , "10.36.164.154"
    , "10.36.193.245"
    , "10.36.204.78"
    , "10.36.211.164"
    , "10.36.219.238"
    , "10.36.176.215"
    , "10.36.157.138"
    , "10.36.162.111"
    , "10.36.177.195"
    , "10.36.183.50"
    , "10.36.185.25"
    , "10.36.173.124"
    , "10.36.160.240"
    , "10.36.161.216"
    , "10.36.194.69"
    , "10.36.208.51"
    , "10.36.183.205"
    , "10.36.209.234"
    , "10.36.219.242"
    , "10.36.220.0"
    , "10.36.131.185"
    , "10.36.220.23"
    , "10.36.220.29"
    , "10.36.220.60"
    , "10.36.220.111"
    , "10.36.220.113"
    , "10.36.220.117"
    , "10.36.149.229"
    , "10.36.220.135"
    , "10.36.220.140"
    , "10.36.220.147"
    , "10.36.131.1"
    , "10.36.132.29"
    , "10.36.130.54"
    , "10.36.130.204"
    , "10.36.132.4"
    , "10.36.133.127"
    , "10.36.137.69"
    , "10.36.137.123"
    , "10.36.141.150"
    , "10.36.141.48"
    , "10.36.142.91"
    , "10.36.151.128"
    , "10.36.152.143"
    , "10.36.153.77"
    , "10.36.153.79"
    , "10.36.153.186"
    , "10.36.156.75"
    , "10.36.160.84"
    , "10.36.132.45"
    , "10.36.160.225"
    , "10.36.165.123"
    , "10.36.167.134"
    , "10.36.168.91"
    , "10.36.168.93"
    , "10.36.132.140"
    , "10.36.130.122"
    , "10.36.155.202"
    , "10.36.155.242"
    , "10.36.157.98"
    , "10.36.130.147"
    , "10.36.138.117"
    , "10.36.153.136"
    , "10.36.160.224"
    , "10.36.171.141"
    , "10.36.173.97"
    , "10.36.173.109"
    , "10.36.173.239"
    , "10.36.174.97"
    , "10.36.174.211"
    , "10.36.139.255"
    , "10.36.175.6"
    , "10.36.152.161"
    , "10.36.178.45"
    , "10.36.179.133"
    , "10.36.180.174"
    , "10.36.137.44"
    , "10.36.133.69"
    , "10.36.168.171"
    , "10.36.171.213"
    , "10.36.172.119"
    , "10.36.135.57"
    , "10.36.199.183"
    , "10.36.175.152"
    , "10.36.130.191"
    , "10.36.175.230"
    , "10.36.143.193"
    , "10.36.158.9"
    , "10.36.181.163"
    , "10.36.181.185"
    , "10.36.182.165"
    , "10.36.184.72"
    , "10.36.184.111"
    , "10.36.184.189"
    , "10.36.186.132"
    , "10.36.187.91"
    , "10.36.172.15"
    , "10.36.188.30"
    , "10.36.188.34"
    , "10.36.229.187"
    , "10.36.188.158"
    , "10.36.188.169"
    , "10.36.188.242"
    , "10.36.189.57"
    , "10.36.162.199"
    , "10.36.190.252"
    , "10.36.216.45"
    , "10.36.189.41"
    , "10.36.193.86"
    , "10.36.194.254"
    , "10.36.195.25"
    , "10.36.138.144"
    , "10.36.158.95"
    , "10.36.169.191"
    , "10.36.146.85"
    , "10.36.195.180"
    , "10.36.196.135"
    , "10.36.197.106"
    , "10.36.198.2"
    , "10.36.198.143"
    , "10.36.199.171"
    , "10.36.200.73"
    , "10.36.200.184"
    , "10.36.200.219"
    , "10.36.201.30"
    , "10.36.203.73"
    , "10.36.205.39"
    , "10.36.205.63"
    , "10.36.148.128"
    , "10.36.190.28"
    , "10.36.133.26"
    , "10.36.183.200"
    , "10.36.205.128"
    , "10.36.206.75"
    , "10.36.206.218"
    , "10.36.207.165"
    , "10.36.207.246"
    , "10.36.187.56"
    , "10.36.187.132"
    , "10.36.209.230"
    , "10.36.210.31"
    , "10.36.210.61"
    , "10.36.210.187"
    , "10.36.211.11"
    , "10.36.211.66"
    , "10.36.167.89"
    , "10.36.171.23"
    , "10.36.192.112"
    , "10.36.131.7"
    , "10.36.132.57"
    , "10.36.137.130"
    , "10.36.158.185"
    , "10.36.189.208"
    , "10.36.162.135"
    , "10.36.203.216"
    , "10.36.218.191"
    , "10.36.145.9"
    , "10.36.203.17"
    , "10.36.137.206"
    , "10.36.150.85"
    , "10.36.160.228"
    , "10.36.171.30"
    , "10.36.209.63"
    , "10.36.185.169"
    , "10.36.191.199"
    , "10.36.173.100"
    , "10.36.156.240"
    , "10.36.150.18"
    , "10.36.195.98"
    , "10.36.196.182"
    , "10.36.138.244"
    , "10.36.170.8"
    , "10.36.188.114"
    , "10.36.191.182"
    , "10.36.201.19"
    , "10.36.204.14"
    , "10.36.192.192"
    , "10.36.137.103"
    , "10.36.194.97"
    , "10.36.194.182"
    , "10.36.150.79"
    , "10.36.195.83"
    , "10.36.203.187"
    , "10.36.204.203"
    , "10.36.205.40"
    , "10.36.208.43"
    , "10.36.205.183"
    , "10.36.150.119"
    , "10.36.205.197"
    , "10.36.206.105"
    , "10.36.136.121"
    , "10.36.140.32"
    , "10.36.204.125"
    , "10.36.207.193"
    , "10.36.211.228"
    , "10.36.212.218"
    , "10.36.212.225"
    , "10.36.213.22"
    , "10.36.214.34"
    , "10.36.214.47"
    , "10.36.176.234"
    , "10.36.215.99"
    , "10.36.215.167"
    , "10.36.146.206"
    , "10.36.158.172"
    , "10.36.159.175"
    , "10.36.161.6"
    , "10.36.147.223"
    , "10.36.174.54"
    , "10.36.175.62"
    , "10.36.184.88"
    , "10.36.189.23"
    , "10.36.199.190"
    , "10.36.215.94"
    , "10.36.195.171"
    , "10.36.216.66"
    , "10.36.185.65"
    , "10.36.218.94"
    , "10.36.218.145"
    , "10.36.148.219"
    , "10.36.206.126"
    , "10.36.219.26"
    , "10.36.219.36"
    , "10.36.142.252"
    , "10.36.227.250"
    , "10.36.240.100"
    , "10.36.129.6"
    , "10.36.176.203"
    , "10.36.161.78"
    , "10.36.145.118"
    , "10.36.201.146"
    , "10.36.220.180"
    , "10.36.220.182"
    , "10.36.221.151"
    , "10.36.139.51"
    , "10.36.221.167"
    , "10.36.221.170"
    , "10.36.222.100"
    , "10.36.222.107"
    , "10.36.161.190"
    , "10.36.222.115"
    , "10.36.222.124"
    , "10.36.222.134"
    , "10.36.223.181"
    , "10.36.136.126"
    , "10.36.223.184"
    , "10.36.224.71"
    , "10.36.164.246"
    , "10.36.224.223"
    , "10.36.224.235"
    , "10.36.194.16"
    , "10.36.193.93"
    , "10.36.205.220"
    , "10.36.142.50"
    , "10.36.183.102"
    , "10.36.225.146"
    , "10.36.150.55"
    , "10.36.226.28"
    , "10.36.226.43"
    , "10.36.226.160"
    , "10.36.226.246"
    , "10.36.227.7"
    , "10.36.227.8"
    , "10.36.227.9"
    , "10.36.148.99"
    , "10.36.227.16"
    , "10.36.160.212"
    , "10.36.227.18"
    , "10.36.227.26"
    , "10.36.227.34"
    , "10.36.227.40"
    , "10.36.227.41"
    , "10.36.227.44"
    , "10.36.227.51"
    , "10.36.227.117"
    , "10.36.227.158"
    , "10.36.167.208"
    , "10.36.228.32"
    , "10.36.213.45"
    , "10.36.182.119"
    , "10.36.213.113"
    , "10.36.228.175"
    , "10.36.213.158"
    , "10.36.228.176"
    , "10.36.228.178"
    , "10.36.228.179"
    , "10.36.228.181"
    , "10.36.229.133"
    , "10.36.229.137"
    , "10.36.229.169"
    , "10.36.229.172"
    , "10.36.138.250"
    , "10.36.229.177"
    , "10.36.229.181"
    , "10.36.167.169"
    , "10.36.187.171"
    , "10.36.230.26"
    , "10.36.230.32"
    , "10.36.230.39"
    , "10.36.183.57"
    , "10.36.230.41"
    , "10.36.230.48"
    , "10.36.230.68"
    , "10.36.230.103"
    , "10.36.223.162"
    , "10.36.231.11"
    , "10.36.181.55"
    , "10.36.180.148"
    , "10.36.231.138"
    , "10.36.231.141"
    , "10.36.231.143"
    , "10.36.231.149"
    , "10.36.231.154"
    , "10.36.231.155"
    , "10.36.231.162"
    , "10.36.231.165"
    , "10.36.231.180"
    , "10.36.231.185"
    , "10.36.231.186"
    , "10.36.231.187"
    , "10.36.233.184"
    , "10.36.227.156"
    , "10.36.231.225"
    , "10.36.180.244"
    , "10.36.132.137"
    , "10.36.231.226"
    , "10.36.231.227"
    , "10.36.231.228"
    , "10.36.231.230"
    , "10.36.231.231"
    , "10.36.231.232"
    , "10.36.166.131"
    , "10.36.141.104"
    , "10.36.192.122"
    , "10.36.167.223"
    , "10.36.147.110"
    , "10.36.232.5"
    , "10.36.232.6"
    , "10.36.232.14"
    , "10.36.232.17"
    , "10.36.232.28"
    , "10.36.232.33"
    , "10.36.232.34"
    , "10.36.232.35"
    , "10.36.232.36"
    , "10.36.232.37"
    , "10.36.232.39"
    , "10.36.232.44"
    , "10.36.232.62"
    , "10.36.232.66"
    , "10.36.232.67"
    , "10.36.232.70"
    , "10.36.219.161"
    , "10.36.232.76"
    , "10.36.232.77"
    , "10.36.198.164"
    , "10.36.232.78"
    , "10.36.232.79"
    , "10.36.232.80"
];

const oids = {
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.22": {"name": "rssi"},
    "1.3.6.1.4.1.4115.1.20.1.1.3.42.1.6": {"name": "mac", "type": "hex"}
};


function start() {
    try {
        hosts.forEach(async (target) => {
            console.log("debug0:" + target);
            let data = await poller.get_walk(target, conf.community, conf.options, oids, conf.maxRepetitions);
            console.dir(data);
            session.close();
        });
    } catch (error) {
        console.error(error.toString());
    }
}

start();
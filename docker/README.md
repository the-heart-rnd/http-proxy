# What
Docker-compose file for running http-proxy in docker.

# Usage
## Edit `rewrite.json` file
Edit the rewrite.json file to suit you needs.
To learn more about the rewrite.json file, see the [http-proxy](https://gitlab.rndlab.online/Soft/nodejs/http-proxy/-/blob/master/README.md) README.


## Run
Use docker-compose to run the proxy:

```bash
docker-compose up
```

# More configuration
You can use additional parameters described in the [http-proxy](https://gitlab.rndlab.online/Soft/nodejs/http-proxy/-/blob/master/README.md) README by changing
the `command` in the `docker-compose.yml` file.

```
    command: "npx -y thrnd/http-proxy -c /opt/proxy/rewrites.json"
```

## Ports
By default, the proxy will run on port 8000. If you want to change the port (eg. to 9000), you can use the `-p` flag.

```
    command: "npx -y thrnd/http-proxy -c /opt/proxy/rewrites.json -p 9000"
    ports:
      - "9000:9000"
```

**NOTE:** Keep in mind that you need to change the port in the `ports` section **and** add the `-p` flag!\
Changing only the `ports` section will not work.

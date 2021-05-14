# starboard-nbgrader
Starboard and nbgrader proof of concept

## Running the demo

```
npm i
npm i -g http-server
npm run build

http-server --port 8080 --cors
```

To connect to a local Jupyter Kernel Gateway, run:

```shell
KG_ALLOW_METHODS="*" \
jupyter kernelgateway \
  --KernelGatewayApp.allow_origin="https://unpkg.com" \
  --KernelGatewayApp.allow_headers="authorization,content-type,x-xsrftoken" \
  --JupyterWebsocketPersonality.list_kernels=True
```


## Development

```
npm run start
```

And in a different tab you can serve the demo:

```
http-server --cors
```

Note that the demo runs in a properly sandboxes iframe, which means that you need to do a full reload to see changes.
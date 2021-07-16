# starboard-nbgrader

Starboard and nbgrader proof of concept

## Running the demo

```
npm i
npm i -g http-server
npm run build

http-server --port 8080 --cors
```

To connect to a local [Jupyter Kernel Gateway](https://github.com/jupyter/kernel_gateway), run:

```shell
KG_ALLOW_METHODS="*" \
jupyter kernelgateway --KernelGatewayApp.allow_origin="https://unpkg.com" --KernelGatewayApp.allow_headers="authorization,content-type,x-xsrftoken" --JupyterWebsocketPersonality.list_kernels=True
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

### Testing with Jupyter

Install Jupyter and nbgrader. Then, navigate to the `test_notebooks` directory and execute

```
jupyter notebook
```

The assignments are found in the `test_notebooks/source/assignment_name` directory. After generating them, the student versions will be found in the `test_notebooks/release/assignment_name` directory. Those can be edited in Jupyter or Starboard. And finally, the edited and submitted assignments go in the `test_notebooks/submitted/student_name/assignment_name` directory.

**Potential issues**

- Don't use a too new Python version or you can't install nbgrader
- Downgrade sqlalchemy to 1.3.23 https://github.com/jupyter/nbgrader/issues/1434
- Downgrade nbconvert to 5.6.1 https://github.com/jupyter/nbgrader/issues/1373

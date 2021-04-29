# starboard-nbgrader
Starboard and nbgrader proof of concept

## Running the demo

```
npm i
npm i -g http-server
npm run build

http-server --port 8080 --cors
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
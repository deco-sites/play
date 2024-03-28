# Link list template by deco.cx

A fully featured link tree / link list type of app built with deco.cx — with native support for A/B testing, campaigns, and integrated CMS. Build yours for free at [deco.cx](https://deco.cx).

<div style="display: flex; justify-content: center; width: 100%">
<img width="600px" height="147px"
    src="https://cdn.discordapp.com/attachments/1043241080679841793/1083140431556116553/image.png" />
</div>


## Getting started

To execute this website on your machine, clone it to your local machine with
`git clone` and make sure [deno is installed](https://deno.land/manual@v1.31.1/getting_started/installation).

Then open the terminal, change the directory to where fashion was cloned and type

```sh
deno task start
```

You should see the following output

```
$ deno task start
Task start deno run -A --watch=static/,sections/,functions/ dev.ts
Watcher Process started.
Starting live middleware: siteId=538 site=std
The manifest has been generated for 6 routes, 5 islands, 17 sections and 16 functions.
Githooks setup successfully: pre-commit
Starting live middleware: siteId=239 site=fashion
Listening on http://localhost:8000/
```

Now, open [http://localhost:8000/](http://localhost:8000/). You should see the
links starter running on your machine!
### Best practices

The best practices for managing the project on the long run rely around
respecting folder structure. This means:

1. Add `.tsx` files on `components` folder only
1. Add preact hooks on `sdk` folder.
1. To make a component editable, create it on the `components` folder and add an
   `export { default }` on the `sections` folder
1. To add JavaScript to the browser, create a component on the `components`
   folder and add an `export { default }` on the islands folder

Check performance best practices on
[deco.cx's docs](https://www.deco.cx/docs).

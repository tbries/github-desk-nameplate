# GitHub Pages Development

## Preview the site locally

Serve the folder over HTTP instead:

```sh
cd github-pages
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Alternatively, use the VS Code
[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
extension or run `npx serve github-pages`.

## Legacy example design files

- Example designs live in [`github-pages/inspiration/`](../github-pages/inspiration/)
as one JSON file per design. They are retained for reference; the editor no
longer displays examples or imports and exports design files.
- The `grid` property contains seven 52-character rows:
    - `.` is an empty spot in the grid
    - `r` red,
    - `o` orange
    - `y` yellow
    - `g` green
    - `b` blue
    - `i` pink
    - `p` purple
    - `w` white
    - `n` gray
    - `k` black
- Custom colors are listed in the optional `customColors` array and referenced in order with `1`–`9`.


## Deployment

- The github pages site is automatically deployed if any file changes in the `github-pages` folder are pushed to the `main` branch.
import type { RunInput, Change } from "../shared/types.ts";
export const fixtureCases = {
  pagination: {
    title: "Changing the search filter leaves page two empty",
    description:
      "Open page two, then search for fern. The matching Fern notebook should appear. The filter changes but the current page is not reset, so the results disappear.",
    steps: [
      { type: "click", selector: "#next" },
      { type: "fill", selector: "#search", value: "fern" },
      { type: "text", selector: "#results", value: "Fern notebook" },
    ],
    change: {
      file: "index.html",
      search: "query = e.target.value; render();",
      replace: "query = e.target.value; page = 1; render();",
    },
  },
  empty: {
    title: "No useful empty state when a search has no results",
    description:
      "Search for a product that does not exist. The results area should show No matching notebooks instead of being blank.",
    steps: [
      { type: "fill", selector: "#search", value: "not-a-notebook" },
      { type: "text", selector: "#results", value: "No matching notebooks" },
    ],
    change: {
      file: "index.html",
      search: "if (!items.length) return '';",
      replace:
        "if (!items.length) return '<p class=\"empty\">No matching notebooks</p>';",
    },
  },
  form: {
    title: "Newsletter form reloads instead of showing confirmation",
    description:
      "Enter a valid email and subscribe. The page should display You are on the list without reloading.",
    steps: [
      { type: "fill", selector: "#email", value: "maintainer@example.com" },
      { type: "click", selector: "#subscribe" },
      { type: "text", selector: "#message", value: "You are on the list" },
    ],
    change: {
      file: "index.html",
      search: "form.addEventListener('submit', (e) => {",
      replace: "form.addEventListener('submit', (e) => { e.preventDefault();",
    },
  },
} as const;
export function fixtureInput(key: keyof typeof fixtureCases): RunInput {
  const f = fixtureCases[key];
  return {
    title: f.title,
    description: f.description,
    source: "fixture",
    fixture: key,
    repositoryPath: "",
    recipe: "html",
    steps: JSON.parse(JSON.stringify(f.steps)),
    engine: "gemma",
    search: false,
    issueUrl: "",
    viewport: "desktop",
  };
}
export function fixtureChange(key: keyof typeof fixtureCases): Change {
  return { ...fixtureCases[key].change };
}
export function fixtureHTML(key: keyof typeof fixtureCases) {
  const fixed = (k: string) => k !== key;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fieldnotes · everyday stationery</title><style>*{box-sizing:border-box}body{margin:0;background:#faf8f2;color:#263b31;font:16px Georgia,serif}header{border-bottom:1px solid #ddd9ca;padding:28px 7%;display:flex;justify-content:space-between}main{max-width:1000px;margin:60px auto;padding:0 28px}h1{font-size:54px;font-weight:400;margin-bottom:16px}.kicker{font:12px Arial;letter-spacing:2px;text-transform:uppercase;color:#7c8668}p{line-height:1.7}input{padding:14px;border:1px solid #c9cebf;background:white;border-radius:5px;font:15px Arial}#search{width:100%;margin:22px 0}#results{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;min-height:220px}.card{background:#eeeadc;padding:28px 22px;border-radius:5px}.card span{display:block;font-size:50px;margin-bottom:28px}.card h2{font-size:22px;font-weight:400}button{background:#294f3d;color:#fff;border:0;padding:13px 20px;border-radius:4px;cursor:pointer}#next{margin:20px 0}footer{border-top:1px solid #ddd9ca;margin-top:60px;padding-top:30px}.empty{grid-column:1/-1}small{font:13px Arial;color:#627061}@media(max-width:600px){#results{grid-template-columns:1fr}h1{font-size:36px}}</style></head><body><header><strong>fieldnotes.</strong><small>Objects for a slower day</small></header><main><div class="kicker">THE NOTEBOOK COLLECTION</div><h1>A little space to think.</h1><p>Thoughtfully made notebooks for lists, sketches, and ideas worth keeping.</p><label for="search">Find your notebook</label><input id="search" placeholder="Search the collection…"><div id="results"></div><button id="next">Next page →</button> <small id="page"></small><footer><h2>Letters from the studio</h2><form id="newsletter"><label for="email">Email address</label> <input type="email" id="email" required placeholder="you@example.com"> <button id="subscribe">Subscribe</button></form><p id="message" role="status"></p></footer></main><script>const products=[['Moss notebook','▧'],['Linen notebook','▤'],['Fern notebook','❧'],['River notebook','≋'],['Stone notebook','▥'],['Dawn notebook','☀']];let query='',page=1;function render(){const items=products.filter(p=>p[0].toLowerCase().includes(query.toLowerCase()));document.querySelector('#results').innerHTML=(()=>{${fixed("empty") ? "if (!items.length) return '<p class=\"empty\">No matching notebooks</p>';" : "if (!items.length) return '';"}return items.slice((page-1)*3,page*3).map(p=>'<article class="card"><span>'+p[1]+'</span><h2>'+p[0]+'</h2><small>Recycled paper · ₹240</small></article>').join('')})();document.querySelector('#page').textContent='Page '+page;document.querySelector('#next').disabled=page*3>=items.length;}document.querySelector('#search').addEventListener('input',e=>{${fixed("pagination") ? "query = e.target.value; page = 1; render();" : "query = e.target.value; render();"}});document.querySelector('#next').onclick=()=>{page++;render()};const form=document.querySelector('#newsletter');form.addEventListener('submit', (e) => {${fixed("form") ? " e.preventDefault();" : ""}document.querySelector('#message').textContent='You are on the list';});render();</script></body></html>`;
}

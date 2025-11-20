const parse = require('xml-parser')
const xmljs = require('xml2js')

const builderOpts = {
  rootName: "samdas:EMR",
  xmldec: { standalone: undefined, encoding: "UTF-8" },
  renderOpts: { pretty: false }
}
const xmlbuilder = new xmljs.Builder(builderOpts)
const Parser = new xmljs.Parser()

export const plaintextToHtml = async plaintext => {
  const pattern = /^\S+?:|\*\S+?\*|\/\S+?\/|_\S+?_/gm
  let match
  let start = 0
  let end = 0
  let dest=""
  while ((match = pattern.exec(plaintext)) !== null) {
    const idx = match.index
    const fragment = match[0]
    // end = pat.lastIndex
    if (match.index > start) {
      dest+=(plaintext.substring(start, match.index))
    }
    const attributes = {}
    if (fragment.startsWith("*") || fragment.endsWith(":")) {
      dest+=`<b>${fragment}</b>`
    } else if (fragment.startsWith("_")) {
      dest+=`<span style="text-decoration:underline">${fragment}</span>`
    } else if (fragment.startsWith("/")) {
      dest+=`<i>${fragment}</i>`
    } else {
     dest+=fragment
    }
    start = end
  }
  if (start < plaintext.length) {
    dest+=(plaintext.substring(start))
  }
  
  dest= dest.replace(/[\n\r][\r\n]?/g,"<br />")
  return dest.replace(/(<br\s*\/>{3,})/,"<br />")
}

export const samdasToHtml = async samdastext => {
  const raw = await repair(samdastext) //samdastext.replace(/&#xD;/g, "\n")
  const analyze = parse(raw.replace(/\n/g, "&#xD;"))
  const record = analyze.root.children[0]
  const elements = record.children
  const texts = elements.filter(element => {
    return (element.name.indexOf('text') > -1)
  }).map(e => e.content)
  const xrefs = elements.filter(element => {
    return (element.name.indexOf('xref') > -1)
  }).map(e => {
    e.attributes.type = "xref"
    return e.attributes
  })
  const hints = elements.filter(element => {
    return (element.name.indexOf('hint') > -1)
  }).map(e => e.attributes)
  const markups = elements.filter(element => {
    return (element.name.indexOf('markup') > -1)
  }).map(e => e.attributes)
    .concat(xrefs)
    .concat(hints)
    .sort((a, b) => a.from - b.from)
  let plaintext = ""
  texts.forEach(text => { plaintext = plaintext + text })
  plaintext = plaintext.replace(/&#xD;/g, "\n")
  if (plaintext === "undefined") {
    plaintext = ""
  }
  let dest = ""
  let pos = 0
  for (let markup of markups) {
    let marked = plaintext.substr(markup.from, markup.length)
    dest += plaintext.substring(pos, markup.from)
    switch (markup.type) {
      case "bold": dest += `<strong>${marked}</strong>`; break;
      case "italic": dest += `<i>${marked}</i>`; break;
      case "underline":
        dest += `<span style="text-decoration:underline">${marked}</span>`;
        break;
      case "xref":
        dest += `<span data-xref-id="${markup.id}" data-xref-provider="${markup.provider}">${marked}</span>`
        break;
      case "h1": dest += `<h1>${marked}</h1>`; break;
      case "h2": dest += `<h2>${marked}</h2>`; break;
      case "h3": dest += `<h3>${marked}</h3>`; break;
      case "h4": dest += `<h4>${marked}</h4>`; break;
      default:
        dest += `<span style="color:red">unknown markup</span>`
    }

    pos = parseInt(markup.from) + parseInt(markup.length)

    if (markup.linebreak && plaintext.charAt(pos) == "\n") {
      pos += 1
    }
  }
  if(pos<plaintext.length){
    dest+=plaintext.substr(pos)
  }
  dest=dest.replace(/\n\n/g,"\n")
  return dest.replace(/\n/g, "<br />")
}


let text
let markups = []
let xrefs = []

/**
 * Test if the current markup is one of *bold*, /italic/, _underline_, [xref], or
 * ^linestart:
 * 
 * @param {} scanpos Position of first char (except for linestart, see below)
 * @param {*} length Length of markup
 */
function isSymbol(scanpos, length) {
  const endpos = scanpos + length - 1
  // Test for a word between special chars *,/,_
  if (text.charAt(scanpos).match(/[\*\/_]/)) {
    if (text.charAt(scanpos) === text.charAt(endpos)) {
      return [true, 0]
    }

    /* test for a string in square brackets. Note: The Elexis Samdas implementation
    does not set the length consistently correct */
  } else if (text.charAt(scanpos) == "[") {
    if (text.charAt(endpos) == "]") {
      return [true, 0]
    }
    if (text.charAt(endpos - 1) == "]") {
      return [true, -1]
    }


    /* Test for a word starting at the beginning of a line and 
      ending with :. Note: The Elexis Samdas implementation has a bug here:
      The newline before the word is counted for the match */
  } else if ((scanpos > 0) && text.substr(scanpos - 1, length + 1).match(/\n\S+:/m)) {
    return [true, 0]
  }
  return [false, 0]
}
function isWordBound(scanpos, length) {
  if (scanpos == 0) {
    if (text.substr(scanpos, length + 1).match(/^\S+\s?$/m)) {
      return true
    }
  } else {
    if (text.substr(scanpos-1, length + 2).match(/[\.,\?!\"\'\s\n]\S+\s?$/m)) {
      return true
    }
    
  }
 
  return false
}
function scan(pos, length) {
  const checkpositions = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]
  for (let offset of checkpositions) {
    const scanpos = pos + offset
    const symbolResult = isSymbol(pos + offset, length)
    if (symbolResult[0] == true) {
      return [scanpos, length + symbolResult[1]]
    }
  }
  for (let offset of checkpositions) {
    const scanpos = pos + offset
    if (isWordBound(scanpos + offset, length)) {
      return [scanpos, length]
    }
  }
  return [pos, length]
}

function checkAlignment(m) {
  const ret = Object.assign({}, m)
  const adjust = scan(parseInt(ret.$.from), parseInt(ret.$.length))
  ret.$.from = adjust[0]
  ret.$.length = adjust[1]
  return ret
}

function repair(samdastext) :Promise<string> {
  text = ""
  markups = []
  xrefs = []
  const hints = []
  return new Promise((resolve, reject) => {
    Parser.parseString(samdastext, (err, orig) => {
      if (err) {
        reject(err)
      }
      let root = orig["samdas:EMR"]
      if (!root) {
        root = orig.samdas
      }
      if (!root) {
        reject("no valid root element found")
      }
      let record = root["samdas:record"]
      if (!record) {
        record = root.record
      }
      if (!record || !Array.isArray(record) || record.length != 1) {
        reject("bad Samdas format: No valid record entry")
      }
      const rec = record[0]
      let tx = rec["samdas:text"]
      if (!tx) {
        tx = rec.text
      }
      text = tx[0].replace(/&#xD;/g, "\n")
      let lm = rec["samdas:markup"]
      if (!lm) {
        lm = rec.markup
      }
      if (lm && Array.isArray(lm)) {
        for (const markup of lm) {
          markups.push(checkAlignment(markup))
        }
      }
      let xr = rec["samdas:xref"]
      if (!xr) {
        xr = rec.xref
      }
      if (xr && Array.isArray(xr)) {
        for (const xref of xr) {
          xrefs.push(checkAlignment(xref))
        }
      }
      let extensions = rec["samdas:hints"]
      if (!extensions) {
        extensions = rec.hints
      }
      if (extensions && Array.isArray(extensions)) {
        for (const ext of extensions) {
          hints.push(checkAlignment(ext))
        }
      }
      const ret = {
        $: {
          "xmlns:samdas": "http://www.elexis.ch/XSD"
        },
        "samdas:record": {
          "samdas:text": text,
          "samdas:markup": markups,
          "samdas:xref": xrefs,
          "samdas:hints": hints
        }
      }
      resolve(xmlbuilder.buildObject(ret))
    })
  })

}
// config-xlsx.js — 配置转表工具（零第三方依赖）。
//
// 用法：
//   node tools/config-xlsx.js export [输出路径.xlsx]   把 src/config/gameData.js 导出成 Excel
//   node tools/config-xlsx.js import [输入路径.xlsx]   把 Excel 导回，重写 src/config/gameData.js
//
// 默认文件： tools/gameData.xlsx
//
// 设计：把 gameData.js 的各配置块「拍平」成多个 sheet，每个 sheet 是一张二维表。
// 导入时按 sheet 还原成数据结构，再重新生成 gameData.js（数据段程序化序列化，保留文件头注释）。
//
// ⚠️ 仅支持结构化数据块（数组 / 对象数组 / 键值语料）。带函数的块（如室内 decorate）不在转表范围，
//    留在各自源文件，不受影响。

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const GAMEDATA = path.join(ROOT, "src", "config", "gameData.js");
const DEFAULT_XLSX = path.join(__dirname, "gameData.xlsx");

// ============================================================
// Sheet 定义：描述每个配置块如何拍平成表 / 如何还原
// kind:
//   "objects"  —— 对象数组，columns 指定列；每行一个对象
//   "kv-list"  —— { key: [字符串...] }，拍平成 (key, value) 两列，多值多行
//   "kv-script"—— { job: [[contact,[l1,l2,l3]]...] }，拍平成 (job,contact,line1,line2,line3)
//   "list"     —— 纯字符串数组，单列 value
//   "schedule" —— { job:{morning,noon,evening,night} }，拍平成 (job,morning,noon,evening,night)
//   "reputation-actions" —— REPUTATION.actions 对象，拍平成 (action,honor,wanted,gang)
// ============================================================
const SHEETS = [
  { name: "JOBS", kind: "list", var: "JOBS", col: "职业" },
  { name: "GANGS", kind: "list", var: "GANGS", col: "帮派" },
  { name: "SHOP_ITEMS", kind: "objects", var: "SHOP_ITEMS",
    columns: ["id", "ico", "name", "desc", "price", "kind"], nums: ["price"] },
  { name: "PROPERTIES", kind: "objects", var: "PROPERTIES",
    columns: ["id", "name", "price", "x", "z"], nums: ["price", "x", "z"] },
  { name: "BUILDING_DEFS", kind: "objects", var: "BUILDING_DEFS",
    columns: ["name", "sign", "enterable"], bools: ["enterable"] },
  { name: "SMALL_TALK", kind: "kv-list", var: "SMALL_TALK", keyCol: "时段", valCol: "台词" },
  { name: "DIALOGUE_REPLY", kind: "kv-list", var: "DIALOGUE_REPLY", keyCol: "类型", valCol: "台词" },
  { name: "SCARED_TALK", kind: "list", var: "SCARED_TALK", col: "台词" },
  { name: "ANGRY_TALK", kind: "list", var: "ANGRY_TALK", col: "台词" },
  { name: "INDOOR_TALK", kind: "list", var: "INDOOR_TALK", col: "台词" },
  { name: "JOB_SCHEDULE", kind: "schedule", var: "JOB_SCHEDULE" },
  { name: "HEADLINE", kind: "headline", var: "HEADLINE" },
  { name: "PHONE_SCRIPTS", kind: "kv-script", var: "PHONE_SCRIPTS" },
  { name: "GOSSIP", kind: "kv-list", var: "GOSSIP", keyCol: "职业", valCol: "八卦" },
  { name: "PHONE_FIRST", kind: "list", var: "PHONE_FIRST", col: "名字" },
  { name: "PHONE_CONTACTS", kind: "list", var: "PHONE_CONTACTS", col: "联系人" },
  { name: "MUSIC", kind: "music", var: "MUSIC" },
];

// ============================================================
// 载入 gameData.js（用动态 import 读出真实值）
// ============================================================
async function loadGameData() {
  const url = "file://" + GAMEDATA.replace(/\\/g, "/");
  return await import(url + "?t=" + Date.now());
}

// ---------- 拍平：数据 → 二维行数组（首行表头） ----------
function flatten(sheet, data) {
  const v = data[sheet.var];
  switch (sheet.kind) {
    case "list":
      return [[sheet.col], ...v.map((s) => [s])];
    case "objects":
      return [sheet.columns, ...v.map((o) => sheet.columns.map((c) => o[c] ?? ""))];
    case "kv-list": {
      const rows = [[sheet.keyCol, sheet.valCol]];
      for (const key of Object.keys(v)) for (const val of v[key]) rows.push([key, val]);
      return rows;
    }
    case "schedule": {
      const rows = [["职业", "morning", "noon", "evening", "night"]];
      for (const job of Object.keys(v)) {
        const s = v[job];
        rows.push([job, s.morning, s.noon, s.evening, s.night]);
      }
      return rows;
    }
    case "headline": {
      const rows = [["category", "标题(h)", "正文(b)"]];
      for (const cat of Object.keys(v)) for (const item of v[cat]) rows.push([cat, item.h, item.b]);
      return rows;
    }
    case "kv-script": {
      const rows = [["职业", "联系人", "消息1", "消息2", "消息3", "消息4"]];
      for (const job of Object.keys(v)) {
        for (const [contact, lines] of v[job]) {
          rows.push([job, contact, ...lines, ...Array(Math.max(0, 4 - lines.length)).fill("")]);
        }
      }
      return rows;
    }
    case "music": {
      const rows = [["轨道", "src", "volume", "loop", "fade"]];
      for (const key of Object.keys(v)) {
        const t = v[key];
        if (t && typeof t === "object" && "src" in t) {
          rows.push([key, t.src, t.volume, t.loop, t.fade]);
        } else {
          // 标量开关（如 wantedDucksInterface）单独一行，值放 src 列
          rows.push([key, t, "", "", ""]);
        }
      }
      return rows;
    }
    default:
      return [["value"]];
  }
}

// ---------- 还原：二维行数组 → 数据结构 ----------
function unflatten(sheet, rows) {
  const body = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
  switch (sheet.kind) {
    case "list":
      return body.map((r) => r[0]);
    case "objects":
      return body.map((r) => {
        const o = {};
        sheet.columns.forEach((c, i) => {
          let val = r[i] ?? "";
          if (sheet.nums && sheet.nums.includes(c)) val = Number(val);
          if (sheet.bools && sheet.bools.includes(c)) val = String(val).toLowerCase() === "true";
          o[c] = val;
        });
        // 去掉 objects 中值为 false 的 bool（保持与原写法一致：只有 true 才带 enterable）
        if (sheet.bools) for (const b of sheet.bools) if (o[b] === false) delete o[b];
        return o;
      });
    case "kv-list": {
      const obj = {};
      for (const r of body) {
        const k = r[0], val = r[1];
        if (!obj[k]) obj[k] = [];
        obj[k].push(val);
      }
      return obj;
    }
    case "schedule": {
      const obj = {};
      for (const r of body) obj[r[0]] = { morning: r[1], noon: r[2], evening: r[3], night: r[4] };
      return obj;
    }
    case "headline": {
      const obj = {};
      for (const r of body) {
        const cat = r[0];
        if (!obj[cat]) obj[cat] = [];
        obj[cat].push({ h: r[1], b: r[2] });
      }
      return obj;
    }
    case "kv-script": {
      const obj = {};
      for (const r of body) {
        const job = r[0], contact = r[1];
        const lines = [r[2], r[3], r[4], r[5]].filter((x) => x != null && String(x).trim() !== "");
        if (!obj[job]) obj[job] = [];
        obj[job].push([contact, lines]);
      }
      return obj;
    }
    case "music": {
      const obj = {};
      for (const r of body) {
        const key = r[0];
        const src = r[1], vol = r[2], loop = r[3], fade = r[4];
        // 轨道对象行：有 volume/fade 列；标量开关行：只有 src 列有值
        if (String(vol).trim() !== "" || String(fade).trim() !== "") {
          obj[key] = {
            src: String(src),
            volume: Number(vol),
            loop: String(loop).toLowerCase() === "true",
            fade: Number(fade),
          };
        } else {
          // 标量：尝试解析 bool / number，否则原样字符串
          const s = String(src).trim();
          if (s === "true" || s === "false") obj[key] = s === "true";
          else if (s !== "" && !isNaN(Number(s))) obj[key] = Number(s);
          else obj[key] = src;
        }
      }
      return obj;
    }
    default:
      return [];
  }
}

// ============================================================
// 极简 XLSX 写入（OOXML + 手写 zip，无第三方依赖）
// ============================================================
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function colName(n) { // 1->A
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheetXml(rows) {
  let body = "";
  rows.forEach((row, ri) => {
    const r = ri + 1;
    let cells = "";
    row.forEach((val, ci) => {
      const ref = colName(ci + 1) + r;
      if (typeof val === "number" && isFinite(val)) {
        cells += `<c r="${ref}"><v>${val}</v></c>`;
      } else {
        cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
      }
    });
    body += `<row r="${r}">${cells}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function buildXlsx(sheetsData) {
  // sheetsData: [{name, rows}]
  const files = {};
  files["[Content_Types].xml"] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheetsData.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `</Types>`;
  files["_rels/.rels"] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  files["xl/workbook.xml"] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    sheetsData.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets></workbook>`;
  files["xl/_rels/workbook.xml.rels"] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheetsData.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `</Relationships>`;
  sheetsData.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.rows); });
  return zipStore(files);
}

// ---------- 极简 ZIP（deflate 压缩）----------
function crc32(buf) {
  let c;
  if (!crc32.table) {
    crc32.table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[n] = c >>> 0;
    }
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crc32.table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const entries = [];
  const chunks = [];
  let offset = 0;
  for (const name of Object.keys(files)) {
    const nameBuf = Buffer.from(name, "utf8");
    const content = Buffer.from(files[name], "utf8");
    const compressed = zlib.deflateRawSync(content);
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 flag
    local.writeUInt16LE(8, 8);      // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, compressed);
    entries.push({ nameBuf, crc, comp: compressed.length, orig: content.length, offset });
    offset += local.length + nameBuf.length + compressed.length;
  }
  const central = [];
  let cenSize = 0;
  for (const e of entries) {
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0, 14);
    c.writeUInt32LE(e.crc, 16);
    c.writeUInt32LE(e.comp, 20);
    c.writeUInt32LE(e.orig, 24);
    c.writeUInt16LE(e.nameBuf.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(e.offset, 42);
    central.push(c, e.nameBuf);
    cenSize += c.length + e.nameBuf.length;
  }
  const cenOffset = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenSize, 12);
  end.writeUInt32LE(cenOffset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}

// ---------- 极简 ZIP 解压（读 xlsx）----------
function unzip(buf) {
  const files = {};
  let i = 0;
  while (i < buf.length - 4) {
    const sig = buf.readUInt32LE(i);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf8", i + 30, i + 30 + nameLen);
    const dataStart = i + 30 + nameLen + extraLen;
    const comp = buf.slice(dataStart, dataStart + compSize);
    let content;
    if (method === 0) content = comp;
    else content = zlib.inflateRawSync(comp);
    files[name] = content.toString("utf8");
    i = dataStart + compSize;
  }
  return files;
}

// 解析 sheet XML → 二维数组
function parseSheetXml(xml) {
  const shared = null; // inlineStr only
  const rowsMap = {};
  const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cellRe.exec(xml)) !== null) {
    const col = m[1], row = parseInt(m[2], 10), attrs = m[3] || "", body = m[4] || "";
    let val = "";
    if (/t="inlineStr"/.test(attrs)) {
      const t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(body);
      val = t ? decodeXml(t[1]) : "";
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(body);
      val = v ? v[1] : "";
    }
    if (!rowsMap[row]) rowsMap[row] = {};
    rowsMap[row][colNum(col)] = val;
  }
  const rowNums = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);
  const rows = [];
  for (const r of rowNums) {
    const cells = rowsMap[r];
    const maxC = Math.max(...Object.keys(cells).map(Number));
    const arr = [];
    for (let c = 1; c <= maxC; c++) arr.push(cells[c] ?? "");
    rows.push(arr);
  }
  return rows;
}
function colNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function decodeXml(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

// ============================================================
// 重新生成 gameData.js（导入用）
// ============================================================
function serialize(val, indent = 0) {
  const pad = "  ".repeat(indent);
  const pad2 = "  ".repeat(indent + 1);
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    // 字符串数组：紧凑多行
    const allStr = val.every((v) => typeof v === "string");
    if (allStr) {
      return "[\n" + val.map((v) => pad2 + JSON.stringify(v)).join(",\n") + ",\n" + pad + "]";
    }
    return "[\n" + val.map((v) => pad2 + serialize(v, indent + 1)).join(",\n") + ",\n" + pad + "]";
  }
  if (val && typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    return "{\n" + keys.map((k) => {
      const kk = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      return pad2 + kk + ": " + serialize(val[k], indent + 1);
    }).join(",\n") + ",\n" + pad + "}";
  }
  return JSON.stringify(val);
}

// ============================================================
// 主流程
// ============================================================
async function doExport(outPath) {
  const data = await loadGameData();
  const sheetsData = SHEETS.map((s) => ({ name: s.name, rows: flatten(s, data) }));
  const buf = buildXlsx(sheetsData);
  fs.writeFileSync(outPath, buf);
  console.log("✅ 已导出：" + outPath);
  console.log("   含 " + sheetsData.length + " 个 sheet：" + sheetsData.map((s) => s.name).join(", "));
}

async function doImport(inPath) {
  const buf = fs.readFileSync(inPath);
  const files = unzip(buf);
  // 找出各 sheet 对应文件（按 workbook 顺序 = sheet1.xml, sheet2.xml ...）
  const parsed = {};
  SHEETS.forEach((s, i) => {
    const xml = files[`xl/worksheets/sheet${i + 1}.xml`];
    if (xml) parsed[s.var] = unflatten(s, parseSheetXml(xml));
  });

  // 读原 gameData.js，把被转表管理的变量值替换掉，其余（含带函数的块、数值参数）原样保留
  let src = fs.readFileSync(GAMEDATA, "utf8");
  for (const s of SHEETS) {
    if (!parsed[s.var]) continue;
    const newVal = serialize(parsed[s.var], 0);
    const re = new RegExp(`(export const ${s.var}\\s*=\\s*)([\\s\\S]*?)(;\\s*\\n)`, "m");
    if (re.test(src)) {
      src = src.replace(re, `$1${newVal};\n`);
    } else {
      console.warn("⚠️ 未找到变量定义，跳过：" + s.var);
    }
  }
  fs.writeFileSync(GAMEDATA, src, "utf8");
  console.log("✅ 已从 Excel 导回并重写：" + GAMEDATA);
  console.log("   更新了 " + Object.keys(parsed).length + " 个配置块");
}

(async () => {
  const cmd = process.argv[2];
  const file = process.argv[3] || DEFAULT_XLSX;
  if (cmd === "export") await doExport(file);
  else if (cmd === "import") await doImport(file);
  else {
    console.log("用法：");
    console.log("  node tools/config-xlsx.js export [输出.xlsx]   导出配置成 Excel");
    console.log("  node tools/config-xlsx.js import [输入.xlsx]   从 Excel 导回配置");
  }
})();

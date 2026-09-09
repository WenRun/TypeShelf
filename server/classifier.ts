import { FontFace, FontFile } from "@shared/schema";

export interface PresetTagDef {
  name: string;
  color: string;
  category: "style" | "feature" | "script";
}

export const PRESET_TAGS: PresetTagDef[] = [
  { name: "黑体", color: "blue", category: "style" },
  { name: "宋体", color: "amber", category: "style" },
  { name: "楷体", color: "emerald", category: "style" },
  { name: "仿宋", color: "amber", category: "style" },
  { name: "圆体", color: "pink", category: "style" },
  { name: "书法手写", color: "purple", category: "style" },
  { name: "美术创意", color: "indigo", category: "style" },
  { name: "卡通可爱", color: "orange", category: "style" },
  { name: "艺术海报", color: "indigo", category: "style" },
  { name: "等宽字体", color: "cyan", category: "style" },
  { name: "可变字体", color: "violet", category: "feature" },
  { name: "斜体", color: "teal", category: "feature" },
  { name: "多字重家族", color: "slate", category: "feature" },
  { name: "中文", color: "rose", category: "script" },
  { name: "西文", color: "sky", category: "script" },
];

const PRESET_MAP = new Map(PRESET_TAGS.map(t => [t.name, t]));

export function getTagColor(name: string): string {
  const found = PRESET_MAP.get(name);
  if (found) return found.color;
  return "slate";
}

interface RuleMatcher {
  name: string;
  test: (text: string, family: string, faces: FontFace[], files: FontFile[]) => boolean;
}

const RULE_MATCHERS: RuleMatcher[] = [
  {
    name: "黑体",
    test: (txt) => /(黑体|雅黑|兰亭黑|微米黑|等宽黑|正黑|sans[-_ ]?serif|arial|helvetica|inter|roboto|grotesk|gothic)/i.test(txt),
  },
  {
    name: "宋体",
    test: (txt) =>
      /(宋体|仿宋|明体|明朝|报宋|书宋|秀丽宋|times|georgia|garamond|baskerville|minion)/i.test(txt) ||
      (/\bserif\b/i.test(txt) && !/\bsans\b/i.test(txt)),
  },
  {
    name: "楷体",
    test: (txt) => /(楷体|楷书|颜体|柳体|欧体|赵体|kaiti)/i.test(txt),
  },
  {
    name: "圆体",
    test: (txt) => /(圆体|幼圆|准圆|粗圆|细圆|圆趣|圆缘|圆圆|round|rounded)/i.test(txt),
  },
  {
    name: "书法手写",
    test: (txt) =>
      /(行书|草书|行楷|毛笔|手写|书法|泼墨|手迹|笔迹|草体|勘亭流|script|handwriting|handwritten|calligraphy|brush|marker)/i.test(txt),
  },
  {
    name: "卡通可爱",
    test: (txt) =>
      /(卡通|可爱|萌|娃娃|童趣|童真|布丁|棉花糖|果冻|皮皮|动漫|少女|逗云|斗云|comic|cartoon|cute|kawaii|doraemon|love)/i.test(txt),
  },
  {
    name: "艺术海报",
    test: (txt) =>
      /(海报|艺术|创意|空心|立体|炫彩|扭曲|卷来卷去|翅膀硬了|奇思|古粗|裂变|勘亭流|display|poster|titling|decorative)/i.test(txt),
  },
  {
    name: "等宽字体",
    test: (txt) =>
      /(等宽|monospace|jetbrains\s*mono|fira\s*code|roboto\s*mono|source\s*code|consolas|courier|monaco)/i.test(txt),
  },
  {
    name: "可变字体",
    test: (txt, _family, _faces, files) => {
      if (/(variable|\bvar\b)/i.test(txt)) return true;
      return files.some(f => /(variable|\bvar\b)/i.test(f.filename || ""));
    },
  },
  {
    name: "斜体",
    test: (txt, _family, faces) => {
      if (faces.some(f => f.italic)) return true;
      return /(italic|oblique)/i.test(txt);
    },
  },
  {
    name: "多字重家族",
    test: (_txt, _family, faces) => faces.length >= 3,
  },
  {
    name: "中文",
    test: (txt) => /[\u4e00-\u9fa5]/.test(txt) || /(-GB|-B5|_BGT|GB2312|BIG5)/i.test(txt),
  },
];

export function classifyFont(
  family: string,
  faces: FontFace[] = [],
  files: FontFile[] = []
): { name: string; color: string }[] {
  const allText = [
    family,
    ...faces.map(f => f.subfamily || ""),
    ...faces.map(f => f.fullName || ""),
    ...files.map(fl => fl.filename || ""),
    ...files.map(fl => fl.relPath || ""),
  ].join(" ");

  const matchedTags: { name: string; color: string }[] = [];
  const addedNames = new Set<string>();

  for (const matcher of RULE_MATCHERS) {
    if (matcher.test(allText, family, faces, files)) {
      if (!addedNames.has(matcher.name)) {
        addedNames.add(matcher.name);
        matchedTags.push({
          name: matcher.name,
          color: getTagColor(matcher.name),
        });
      }
    }
  }

  // Script classification: if not Chinese, check if western
  if (!addedNames.has("中文")) {
    if (/[a-zA-Z]/.test(allText)) {
      if (!addedNames.has("西文")) {
        addedNames.add("西文");
        matchedTags.push({
          name: "西文",
          color: getTagColor("西文"),
        });
      }
    }
  }

  return matchedTags;
}

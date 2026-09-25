export default class StringHelper {
  constructor() {}
  static matchSqureBracketPlaceholder(message) {
    const reString = `\\[[^\\[\\]]*\\]`;

    const re = new RegExp(reString, "g");

    const found = message.matchAll(re);

    const matchList = [...found].flat();

    return matchList;
  }
}

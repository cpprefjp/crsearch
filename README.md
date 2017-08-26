# CRSearch

[cpprefjp](https://cpprefjp.github.io/) と [boostjp](https://boostjp.github.io/) をいい感じに検索するウィジェット

- [x] cpprefjp
- [ ] boostjp （対応予定）

## ビルド

- `npm install`
- `npm run build`

## デプロイ

```html
<link rel="stylesheet" type="text/css" href="/css/crsearch.css">

<script src="/js/crsearch.js"></script>
<script type="text/javascript"><!--
  $(document).ready(function() {
    var cs = new CRSearch;
    cs.database("https://cpprefjp.github.io");
    cs.database("https://boostjp.github.io");
    cs.searchbox(".crsearch");
  });
--></script>
```

```html
<div class="crsearch"></div>
```

see also: [自分のサービスをcrsearchに対応させる方法](https://github.com/cpprefjp/crsearch/wiki/%E8%87%AA%E5%88%86%E3%81%AE%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%92crsearch%E3%81%AB%E5%AF%BE%E5%BF%9C%E3%81%95%E3%81%9B%E3%82%8B%E6%96%B9%E6%B3%95)

## 開発

- `npm install`
- `npm run dev`
- http://localhost:8080/

## ドキュメント

[Wiki](https://github.com/cpprefjp/crsearch/wiki) を参照。

## ライセンス

→ [LICENSE](LICENSE)


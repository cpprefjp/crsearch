# CRSearch

[cpprefjp](https://cpprefjp.github.io/) と [boostjp](https://boostjp.github.io/) をいい感じに検索するウィジェット

- [x] cpprefjp
- [ ] boostjp （対応予定）

## ビルド

- `npm install`
- `npm run build`

## デプロイ


### ブラウザ

```html
<!DOCTYPE html>
<html>
  <head>
    <title>CRSearch - sample setup</title>
    <link href="css/font-awesome.css" rel="stylesheet">
    <link href="css/crsearch.css" rel="stylesheet">

    <script type="text/javascript" src="js/crsearch-vendor.js"></script>
    <script type="text/javascript" src="js/crsearch.js"></script>

    <script type="text/javascript"><!--
      var crs = new CRSearch;
      crs.database("https://cpprefjp.github.io");
      // crs.database("https://boostjp.github.io");
      crs.searchbox(document.getElementsByClassName('crsearch'));
    --></script>
  </head>

  <body>
    <div class="crsearch"></div>
  </body>
</html>
```

### JavaScript

```javascript
import {default as CRSearch} from 'crsearch'
let crs = new CRSearch
```

## 開発

- `npm install`
- `npm run dev`
- http://localhost:8080/

## ドキュメント

- [Wiki](https://github.com/cpprefjp/crsearch/wiki)
- [自分のサービスをcrsearchに対応させる方法](https://github.com/cpprefjp/crsearch/wiki/%E8%87%AA%E5%88%86%E3%81%AE%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%92crsearch%E3%81%AB%E5%AF%BE%E5%BF%9C%E3%81%95%E3%81%9B%E3%82%8B%E6%96%B9%E6%B3%95)

## ライセンス

→ [LICENSE](LICENSE)


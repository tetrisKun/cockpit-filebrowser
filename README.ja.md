[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# cockpit-filebrowser

[Cockpit](https://cockpit-project.org/) Web コンソール用のモダンなファイルブラウザプラグイン。

React 18、PatternFly v6、Monaco Editor で構築されています。

## 機能

- ファイルとディレクトリの閲覧、作成、名前変更、削除
- ファイルのアップロードとダウンロード（単体・一括対応）
- カット / コピー / ペーストのクリップボード操作
- 内蔵コードエディタ（Monaco）によるシンタックスハイライト
- Markdown プレビュー（分割ビュー対応）
- グリッドビューとテーブルビューの切り替え
- ファイル検索
- ブックマークとクイックアクセスサイドバー
- ファイルプロパティパネル（パーミッション、所有者、サイズなど）
- モバイル・タブレット対応のレスポンシブレイアウト
- タッチデバイス対応（ダブルタップナビゲーション）
- 国際化対応（中国語翻訳を同梱）

## スクリーンショット

*（近日追加予定）*

## 必要条件

- Cockpit >= 137
- Node.js >= 16（ビルド用）

## インストール

### .deb パッケージから

```bash
sudo dpkg -i cockpit-filebrowser_*.deb
```

### ソースから

```bash
git clone https://github.com/tetrisKun/cockpit-filebrowser.git
cd cockpit-filebrowser
npm install
npm run build
sudo make install
```

インストール後、Cockpit コンソールの **ツール > File Browser** からアクセスできます。

## 開発

```bash
npm install
npm run watch        # ウォッチモード（自動リビルド）
make devel-install   # dist/ を ~/.local/share/cockpit/filebrowser にシンボリックリンク
```

ブラウザで `https://localhost:9090/cockpit/@localhost/filebrowser/index.html` を開いてください。

## ビルド

```bash
npm run build        # 本番ビルド（dist/ に出力）
```

## プロジェクト構成

```
src/
  api/            Cockpit ファイルシステム API ラッパー
  store/          React Context + useReducer 状態管理
  components/
    FileBrowser/  ファイルテーブル・グリッドビュー
    FileEditor/   Monaco ベースのコードエディタ
    Toolbar/      ナビゲーション・アクションツールバー
    Sidebar/      クイックアクセス・ブックマーク
    Properties/   ファイルプロパティパネル
    Search/       ファイル検索
    Upload/       ドラッグ＆ドロップアップロードゾーン
    ContextMenu/  右クリックコンテキストメニュー
    Dialogs/      作成・名前変更・削除ダイアログ
po/               翻訳ファイル（.po）
dist/             ビルド出力（リポジトリにはコミットしない）
```

## 技術スタック

- **React 18** + TypeScript
- **PatternFly v6**（UI コンポーネント）
- **Monaco Editor**（コードエディタ、CSP 準拠のためローカル読み込み）
- **esbuild**（バンドラー）
- **Cockpit APIs**（cockpit.spawn、cockpit.file、cockpit.gettext）

## 国際化

すべてのユーザー向け文字列は `cockpit.gettext` を使用しています。翻訳ファイルは `po/*.po` にあります。

```bash
make pot             # .pot テンプレートを生成/更新
make update-po       # .pot を既存の .po ファイルにマージ
```

## ライセンス

[LGPL-2.1](LICENSE)

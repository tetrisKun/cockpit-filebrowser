PACKAGE_NAME = cockpit-filebrowser
VERSION = $(shell node -e "console.log(require('./package.json').version)")
PREFIX ?= /usr

all: dist

dist: node_modules $(wildcard src/*) $(wildcard src/**/*) build.js
	./build.js

node_modules: package.json
	npm install
	touch node_modules

watch: node_modules
	ESBUILD_WATCH=true ./build.js

install: dist
	mkdir -p $(DESTDIR)$(PREFIX)/share/cockpit/filebrowser
	cp -r dist/* $(DESTDIR)$(PREFIX)/share/cockpit/filebrowser/

devel-install: dist
	mkdir -p ~/.local/share/cockpit
	ln -snf $$(pwd)/dist ~/.local/share/cockpit/filebrowser

devel-uninstall:
	rm -f ~/.local/share/cockpit/filebrowser

# i18n
LINGUAS = $(basename $(notdir $(wildcard po/*.po)))

po/$(PACKAGE_NAME).pot: $(wildcard src/*.tsx) $(wildcard src/**/*.tsx) $(wildcard src/**/**/*.tsx)
	@mkdir -p po
	xgettext --default-domain=$(PACKAGE_NAME) --output=$@ --language=JavaScript \
		--keyword=_ --keyword=N_ --keyword=cockpit.gettext:1 \
		--keyword=cockpit.ngettext:1,2 \
		--from-code=UTF-8 \
		$$(find src -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' | grep -v node_modules)

pot: po/$(PACKAGE_NAME).pot

update-po: pot
	for lang in $(LINGUAS); do \
		msgmerge --update po/$$lang.po po/$(PACKAGE_NAME).pot; \
	done

# Packaging
srpm: dist/$(PACKAGE_NAME)-$(VERSION).tar.gz
	rpmbuild -bs \
		--define "_sourcedir $(CURDIR)/dist" \
		--define "_srcrpmdir $(CURDIR)" \
		$(PACKAGE_NAME).spec

rpm: dist/$(PACKAGE_NAME)-$(VERSION).tar.gz
	rpmbuild -bb \
		--define "_sourcedir $(CURDIR)/dist" \
		--define "_rpmdir $(CURDIR)" \
		$(PACKAGE_NAME).spec

dist/$(PACKAGE_NAME)-$(VERSION).tar.gz: dist
	tar czf $@ \
		--transform 's,^dist,$(PACKAGE_NAME)-$(VERSION)/share/cockpit/filebrowser,' \
		dist/*

deb: dist
	dpkg-buildpackage -us -uc -b

clean:
	rm -rf dist/ node_modules/

.PHONY: all watch install devel-install devel-uninstall pot update-po srpm rpm deb clean

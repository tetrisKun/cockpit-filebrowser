Name:           cockpit-filebrowser
Version:        0.2.0
Release:        1%{?dist}
Summary:        Modern file browser plugin for Cockpit web console
License:        LGPL-2.1-only
URL:            https://github.com/tetrisKun/cockpit-filebrowser
Source0:        %{name}-%{version}.tar.gz
BuildArch:      noarch

Requires:       cockpit
Recommends:     tar
Recommends:     zip
Recommends:     unzip

%if 0%{?rhel} >= 8 || 0%{?fedora}
Recommends:     p7zip-plugins
%endif

%description
A full-featured file browser for the Cockpit web administration interface.

Features include:
- Browse, create, rename, delete files and directories
- Edit files with Monaco editor (syntax highlighting)
- Upload files and directories with progress tracking
- Compress and extract archives (tar, tar.gz, zip, 7z)
- Clipboard operations (cut, copy, paste)
- File properties and permissions management
- 20 language translations

%prep
%setup -q

%install
mkdir -p %{buildroot}%{_datadir}/cockpit/filebrowser
cp -r share/cockpit/filebrowser/* %{buildroot}%{_datadir}/cockpit/filebrowser/

%files
%{_datadir}/cockpit/filebrowser/

%changelog
* Fri Feb 14 2026 tetrisKun <tetrisKun@users.noreply.github.com> - 0.1.0-1
- Initial release
- File browsing with table and grid views
- Monaco editor integration for file editing
- Upload files and directories with progress tracking
- Archive compress/extract (tar, tar.gz, zip, 7z)
- Clipboard operations (cut, copy, paste)
- File properties and permissions management
- 20 language translations

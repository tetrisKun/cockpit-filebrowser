import React, { useCallback } from 'react';
import cockpit from 'cockpit';
import { Nav, NavList, NavItem, NavGroup } from "@patternfly/react-core/dist/esm/components/Nav/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Tooltip } from "@patternfly/react-core/dist/esm/components/Tooltip/index.js";
import { HomeIcon } from "@patternfly/react-icons/dist/esm/icons/home-icon.js";
import { FolderIcon } from "@patternfly/react-icons/dist/esm/icons/folder-icon.js";
import { BookmarkIcon } from "@patternfly/react-icons/dist/esm/icons/bookmark-icon.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import './sidebar.scss';

const _ = cockpit.gettext;

interface QuickAccessItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

function getQuickAccessItems(): QuickAccessItem[] {
    let homePath = '/root';
    try {
        const info = cockpit.info as any;
        if (info && info.home) {
            homePath = info.home;
        }
    } catch {
        // fallback to /root
    }

    return [
        { label: _("Home"), path: homePath, icon: <HomeIcon /> },
        { label: _("Root"), path: "/", icon: <FolderIcon /> },
        { label: "/tmp", path: "/tmp", icon: <FolderIcon /> },
        { label: "/etc", path: "/etc", icon: <FolderIcon /> },
        { label: "/var/log", path: "/var/log", icon: <FolderIcon /> },
    ];
}

export const Sidebar: React.FC = () => {
    const { state, dispatch, navigate } = useFileBrowser();

    const quickAccessItems = getQuickAccessItems();

    const handleQuickAccessClick = useCallback((path: string) => {
        navigate(path);
    }, [navigate]);

    const handleBookmarkClick = useCallback((path: string) => {
        navigate(path);
    }, [navigate]);

    const handleRemoveBookmark = useCallback((event: React.MouseEvent, path: string) => {
        event.stopPropagation();
        dispatch({ type: 'REMOVE_BOOKMARK', path });
    }, [dispatch]);

    const handleBookmarkCurrent = useCallback(() => {
        const pathName = state.currentPath.split('/').filter(Boolean).pop() || '/';
        dispatch({
            type: 'ADD_BOOKMARK',
            bookmark: { name: pathName, path: state.currentPath },
        });
    }, [dispatch, state.currentPath]);

    return (
        <Nav aria-label={_("Sidebar navigation")}>
            <NavGroup title={_("Quick Access")}>
                <NavList>
                    {quickAccessItems.map((item) => (
                        <NavItem
                            key={item.path}
                            isActive={state.currentPath === item.path}
                            onClick={() => handleQuickAccessClick(item.path)}
                            className="sidebar-nav-item"
                        >
                            <span className="sidebar-nav-item__icon">{item.icon}</span>
                            <span className="sidebar-nav-item__label">{item.label}</span>
                        </NavItem>
                    ))}
                </NavList>
            </NavGroup>

            <NavGroup title={_("Bookmarks")}>
                <NavList>
                    {state.bookmarks.length === 0 ? (
                        <li className="sidebar-bookmarks-empty">
                            {_("No bookmarks yet")}
                        </li>
                    ) : (
                        state.bookmarks.map((bookmark) => {
                            const displayName = bookmark.path.split('/').filter(Boolean).pop() || '/';
                            return (
                                <NavItem
                                    key={bookmark.path}
                                    isActive={state.currentPath === bookmark.path}
                                    onClick={() => handleBookmarkClick(bookmark.path)}
                                    className="sidebar-nav-item sidebar-bookmark-item"
                                >
                                    <Tooltip content={bookmark.path}>
                                        <span className="sidebar-nav-item__content">
                                            <FolderIcon className="sidebar-nav-item__icon" />
                                            <span className="sidebar-nav-item__label">{displayName}</span>
                                        </span>
                                    </Tooltip>
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        className="sidebar-bookmark-remove"
                                        onClick={(e) => handleRemoveBookmark(e, bookmark.path)}
                                        aria-label={_("Remove bookmark")}
                                    >
                                        <TimesIcon />
                                    </Button>
                                </NavItem>
                            );
                        })
                    )}
                </NavList>
            </NavGroup>

            <div className="sidebar-bookmark-current">
                <Button
                    variant="secondary"
                    icon={<BookmarkIcon />}
                    onClick={handleBookmarkCurrent}
                    isBlock
                    size="sm"
                >
                    {_("Bookmark current")}
                </Button>
            </div>
        </Nav>
    );
};

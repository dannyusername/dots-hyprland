const { Gdk, GdkPixbuf, Gio, GLib, Gtk } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { Box, Button, EventBox, Label, Overlay, Revealer, Scrollable, Stack } = Widget;
const { execAsync, exec } = Utils;
import { fileExists } from '../../.miscutils/files.js';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { MarginRevealer } from '../../.widgethacks/advancedrevealers.js';
import { setupCursorHover, setupCursorHoverInfo } from '../../.widgetutils/cursorhover.js';
import BooruService from '../../../services/booru.js';
import { chatEntry } from '../apiwidgets.js';
import { ConfigToggle } from '../../.commonwidgets/configwidgets.js';
import { SystemMessage } from './ai_chatmessage.js';

const IMAGE_REVEAL_DELAY = 13; // Some wait for inits n other weird stuff
const USER_CACHE_DIR = GLib.get_user_cache_dir();



// Create cache folder and clear pics from previous session
Utils.exec(`bash -c 'mkdir -p ${USER_CACHE_DIR}/ags/media/waifus'`);
Utils.exec(`bash -c 'rm ${USER_CACHE_DIR}/ags/media/waifus/*'`);

const TagButton = (command) => Button({
    className: 'sidebar-chat-chip sidebar-chat-chip-action txt txt-small',
    onClicked: () => { chatEntry.buffer.text += `${command} ` },
    setup: setupCursorHover,
    label: command,
});

const CommandButton = (command, displayName = command) => Button({
    className: 'sidebar-chat-chip sidebar-chat-chip-action txt txt-small',
    onClicked: () => sendMessage(command),
    setup: setupCursorHover,
    label: displayName,
});

export const booruTabIcon = Box({
    hpack: 'center',
    homogeneous: true,
    children: [
        MaterialIcon('gallery_thumbnail', 'norm'),
    ]
});

const BooruInfo = () => {
    const booruLogo = Label({
        hpack: 'center',
        className: 'sidebar-chat-welcome-logo',
        label: 'gallery_thumbnail',
    })
    return Box({
        vertical: true,
        vexpand: true,
        className: 'spacing-v-15',
        children: [
            booruLogo,
            Label({
                className: 'txt txt-title-small sidebar-chat-welcome-txt',
                wrap: true,
                justify: Gtk.Justification.CENTER,
                label: 'Anime booru',
            }),
            Box({
                className: 'spacing-h-5',
                hpack: 'center',
                children: [
                    Label({
                        className: 'txt-smallie txt-subtext',
                        wrap: true,
                        justify: Gtk.Justification.CENTER,
                        label: getString('Powered by Szurubooru'),
                    }),
                    Button({
                        className: 'txt-subtext txt-norm icon-material',
                        label: 'info',
                        tooltipText: getString('Locally hosted image booru on http://localhost:8080'),
                        setup: setupCursorHoverInfo,
                    }),
                ]
            }),
        ]
    });
}

export const BooruSettings = () => MarginRevealer({
    transition: 'slide_down',
    revealChild: true,
    child: Box({
        vertical: true,
        className: 'sidebar-chat-settings',
        children: [
            Box({
                vertical: true,
                hpack: 'fill',
                className: 'sidebar-chat-settings-toggles',
                children: [
                    ConfigToggle({
                        icon: 'menstrual_health',
                        name: getString('Lewds'),
                        desc: getString("Shows naughty stuff when enabled.\nYa like those? Add this to user_options.js:\n\t'sidebar': {\n\t'image': {\n\t\t'allowNsfw': true,\n\t}\n}"),
                        initValue: BooruService.nsfw,
                        onChange: (self, newValue) => {
                            BooruService.nsfw = newValue;
                        },
                        extraSetup: (self) => self.hook(BooruService, (self) => {
                            self.attribute.enabled.value = BooruService.nsfw;
                        }, 'notify::nsfw')
                    }),
                    ConfigToggle({
                        icon: 'sell',
                        name: getString('Save in folder by tags'),
                        desc: getString('Saves images in folders by their tags'),
                        initValue: userOptions.sidebar.image.saveInFolderByTags,
                        onChange: (self, newValue) => {
                            userOptions.sidebar.image.saveInFolderByTags = newValue;
                        },
                    }),
                ]
            })
        ]
    })
});

const booruWelcome = Box({
    vexpand: true,
    homogeneous: true,
    child: Box({
        className: 'spacing-v-15',
        vpack: 'center',
        vertical: true,
        children: [
            BooruInfo(),
            BooruSettings(),
        ]
    })
});



const BooruPage = (taglist, serviceName = 'Booru') => {
    const PageState = (icon, name) => Box({
        className: 'spacing-h-5 txt',
        children: [
            Label({
                className: 'sidebar-waifu-txt txt-smallie',
                xalign: 0,
                label: name,
            }),
            MaterialIcon(icon, 'norm'),
        ]
    })
    const ImageAction = ({ name, icon, action }) => Button({
        className: 'sidebar-waifu-image-action txt-norm icon-material',
        tooltipText: name,
        label: icon,
        onClicked: action,
        setup: setupCursorHover,
    })
    const PreviewImage = (data, delay = 0) => {
        const imageArea = Widget.DrawingArea({
            className: 'sidebar-booru-image-drawingarea',
        });
        const imageBox = Box({
            className: 'sidebar-booru-image',
            // css: `background-image: url('${data.preview_url}');`,
            attribute: {
                'update': (self, data, force = false) => {
                    const imagePath = `${USER_CACHE_DIR}/ags/media/waifus/${data.md5}.${data.file_ext}`;
                    const widgetStyleContext = imageArea.get_style_context();
                    const widgetWidth = widgetStyleContext.get_property('min-width', Gtk.StateFlags.NORMAL);
                    const widgetHeight = widgetWidth / data.aspect_ratio;
                    imageArea.set_size_request(widgetWidth, widgetHeight);
                    const showImage = () => {
                        // const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imagePath, widgetWidth, widgetHeight);
                        const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(imagePath, widgetWidth, widgetHeight, false);
                        imageArea.connect("draw", (widget, cr) => {
                            const borderRadius = widget.get_style_context().get_property('border-radius', Gtk.StateFlags.NORMAL);

                            // Draw a rounded rectangle
                            cr.arc(borderRadius, borderRadius, borderRadius, Math.PI, 1.5 * Math.PI);
                            cr.arc(widgetWidth - borderRadius, borderRadius, borderRadius, 1.5 * Math.PI, 2 * Math.PI);
                            cr.arc(widgetWidth - borderRadius, widgetHeight - borderRadius, borderRadius, 0, 0.5 * Math.PI);
                            cr.arc(borderRadius, widgetHeight - borderRadius, borderRadius, 0.5 * Math.PI, Math.PI);
                            cr.closePath();
                            cr.clip();

                            // Paint image as bg
                            Gdk.cairo_set_source_pixbuf(cr, pixbuf, (widgetWidth - widgetWidth) / 2, (widgetHeight - widgetHeight) / 2);
                            cr.paint();
                        });
                        self.queue_draw();
                        imageRevealer.revealChild = true;
                    }
                    // Show
                    // const downloadCommand = `wget -O '${imagePath}' '${data.preview_url}'`;
                    const downloadCommand = `curl -L -o '${imagePath}' '${data.preview_url}'`;
                    if (!force && fileExists(imagePath)) showImage();
                    else Utils.timeout(delay, () => Utils.execAsync(['bash', '-c', downloadCommand])
                        .then(showImage)
                        .catch(print)
                    );
                },
            },
            child: imageArea,
            setup: (self) => {
                Utils.timeout(1000, () => self.attribute.update(self, data));
            }
        });
        const imageActions = Revealer({
            transition: 'crossfade',
            transitionDuration: userOptions.animations.durationLarge,
            child: Box({
                vpack: 'start',
                className: 'sidebar-booru-image-actions spacing-h-3',
                children: [
                    Box({ hexpand: true }),
                    ImageAction({
                        name: getString('Favorite image'),
                        icon: 'star',
                        action: async () => {
                            await makeFavorite(data.id);
                        }
                    }),
                    ImageAction({
                        name: getString('Open file'),
                        icon: 'open_in_new',
                        action: () => execAsync(['mpv', `${data.file_url}`]).catch(print),
                    }),
                    ImageAction({
                        name: getString('Go to post'),
                        icon: 'web',
                        action: () => execAsync(['xdg-open', `http://localhost:8080/post/${data.id}`]).catch(print),
                    }),
                    ImageAction({
                        name: getString('Go to source'),
                        icon: 'search',
                        action: () => execAsync(['xdg-open', `${data.source}`]).catch(print),
                    }),
                    ImageAction({
                        name: getString('Save to Wallpapers'),
                        icon: 'note',
                        action: async () => {
                            const filePath = "$(xdg-user-dir PICTURES)/Wallpapers/.szuru";
                            
                            const fileName = `${data.id}.${data.file_ext}`;
                            //const fileName = `${data.id}_${data.canvasWidth}x${data.canvasHeight}.${data.file_ext}`; // For some reason canvasWidth and Height are undefined...

                            const saveCommand = `mkdir -p "${filePath}" && curl -L -o "${filePath}/${fileName}" "${data.file_url}"`;
                            const setWallpaperCommand = `${App.configDir}/scripts/color_generation/switchwall.sh "${filePath}/${fileName}"`;

                            execAsync(['bash', '-c', saveCommand])
                                .then(() => execAsync(['bash', '-c', setWallpaperCommand]))
                                .then(() => addToPool(4, data.id))
                                .catch(print);
                        }
                    }),
                ]
            })
        });
        const imageOverlay = Overlay({
            passThrough: true,
            child: imageBox,
            overlays: [imageActions]
        });
        const imageRevealer = Revealer({
            transition: 'slide_down',
            transitionDuration: userOptions.animations.durationLarge,
            child: EventBox({
                onHover: () => { imageActions.revealChild = true },
                onHoverLost: () => { imageActions.revealChild = false },
                child: imageOverlay,
            })
        })
        return imageRevealer;
    }
    const downloadState = Stack({
        homogeneous: false,
        transition: 'slide_up_down',
        transitionDuration: userOptions.animations.durationSmall,
        children: {
            'api': PageState('api', getString('Calling API')),
            'download': PageState('downloading', getString('Downloading image')),
            'done': PageState('done', getString('Finished!')),
            'error': PageState('error', getString('Error')),
        },
    });
    const downloadIndicator = MarginRevealer({
        vpack: 'center',
        transition: 'slide_left',
        revealChild: true,
        child: downloadState,
    });
    const pageHeading = Box({
        vertical: true,
        children: [
            Box({
                children: [
                    Label({
                        hpack: 'start',
                        className: `sidebar-booru-provider`,
                        label: `${serviceName}`,
                        truncate: 'end',
                        maxWidthChars: 20,
                    }),
                    Box({ hexpand: true }),
                    downloadIndicator,
                ]
            }),
            Box({
                children: [
                    Scrollable({
                        hexpand: true,
                        vscroll: 'never',
                        hscroll: 'automatic',
                        child: Box({
                            hpack: 'fill',
                            className: 'spacing-h-5',
                            children: [
                                ...taglist.map((tag) => TagButton(tag)),
                                Box({ hexpand: true }),
                            ]
                        })
                    }),
                ]
            })
        ]
    });
    const pageImages = Box({
        hpack: 'start',
        homogeneous: true,
        className: 'sidebar-booru-imagegrid',
    })
    const pageImageRevealer = Revealer({
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        child: pageImages,
    });
    const thisPage = Box({
        homogeneous: true,
        className: 'sidebar-chat-message',
        attribute: {
            'imagePath': '',
            'isNsfw': false,
            'update': (data, force = false) => { // TODO: Use columns. Sort min to max h/w ratio then greedily put em in...
                // Sort by .aspect_ratio
                data = data.sort(
                    (a, b) => a.aspect_ratio - b.aspect_ratio
                );
                if (data.length == 0) {
                    downloadState.shown = 'error';
                    return;
                }
                const imageColumns = userOptions.sidebar.image.columns;
                const imageRows = data.length / imageColumns;

                // Init cols
                pageImages.children = Array.from(
                    { length: imageColumns },
                    (_, i) => Box({
                        attribute: { height: 0 },
                        vertical: true,
                    })
                );
                // Greedy add O(n^2) 😭
                for (let i = 0; i < data.length; i++) {
                    // Find column with lowest length
                    let minHeight = Infinity;
                    let minIndex = -1;
                    for (let j = 0; j < imageColumns; j++) {
                        const height = pageImages.children[j].attribute.height;
                        if (height < minHeight) {
                            minHeight = height;
                            minIndex = j;
                        }
                    }
                    // Add image to it
                    pageImages.children[minIndex].pack_start(PreviewImage(data[i], minIndex), false, false, 0)
                    pageImages.children[minIndex].attribute.height += 1 / data[i].aspect_ratio; // we want height/width
                }
                pageImages.show_all();

                // Reveal stuff
                Utils.timeout(IMAGE_REVEAL_DELAY,
                    () => pageImageRevealer.revealChild = true
                );
                downloadIndicator.attribute.hide();
            },
        },
        children: [Box({
            vertical: true,
            children: [
                pageHeading,
                Box({
                    vertical: true,
                    children: [pageImageRevealer],
                })
            ]
        })],
    });
    return thisPage;
}

const booruContent = Box({
    className: 'spacing-v-15',
    vertical: true,
    attribute: {
        'map': new Map(),
    },
    setup: (self) => self
        .hook(BooruService, (box, id) => {
            if (id === undefined) return;
            const newPage = BooruPage(BooruService.queries[id].taglist, BooruService.queries[id].providerName);
            box.add(newPage);
            box.show_all();
            box.attribute.map.set(id, newPage);
        }, 'newResponse')
        .hook(BooruService, (box, id) => {
            if (id === undefined) return;
            if (!BooruService.responses[id]) return;
            box.attribute.map.get(id)?.attribute.update(BooruService.responses[id]);
        }, 'updateResponse')
    ,
});

export const booruView = Scrollable({
    className: 'sidebar-chat-viewport',
    vexpand: true,
    child: Box({
        vertical: true,
        children: [
            booruWelcome,
            booruContent,
        ]
    }),
    setup: (scrolledWindow) => {
        // Show scrollbar
        scrolledWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        const vScrollbar = scrolledWindow.get_vscrollbar();
        vScrollbar.get_style_context().add_class('sidebar-scrollbar');
        // Avoid click-to-scroll-widget-to-view behavior
        Utils.timeout(1, () => {
            const viewport = scrolledWindow.child;
            viewport.set_focus_vadjustment(new Gtk.Adjustment(undefined));
        })
        // Scroll to bottom with new content if chat entry not focused
        const adjustment = scrolledWindow.get_vadjustment();
        adjustment.connect("changed", () => {
            if (!chatEntry.hasFocus) return;
            adjustment.set_value(adjustment.get_upper() - adjustment.get_page_size());
        })
    }
});

const booruTags = Revealer({
    revealChild: false,
    transition: 'crossfade',
    transitionDuration: userOptions.animations.durationLarge,
    child: Box({
        className: 'spacing-h-5',
        children: [
            Scrollable({
                vscroll: 'never',
                hscroll: 'automatic',
                hexpand: true,
                child: Box({
                    className: 'spacing-h-5',
                    children: [
                        TagButton('( * )'),
                        TagButton('hololive'),
                    ]
                })
            }),
            Box({ className: 'separator-line' }),
        ]
    })
});

export const booruCommands = Box({
    className: 'spacing-h-5',
    setup: (self) => {
        self.pack_end(CommandButton('/clear'), false, false, 0);
        self.pack_end(CommandButton('/next'), false, false, 0);
        self.pack_start(Button({
            className: 'sidebar-chat-chip-toggle',
            setup: setupCursorHover,
            label: getString('Tags →'),
            onClicked: () => {
                booruTags.revealChild = !booruTags.revealChild;
            }
        }), false, false, 0);
        self.pack_start(booruTags, true, true, 0);
    }
});

const clearChat = () => { // destroy!!
    booruContent.attribute.map.forEach((value, key, map) => {
        value.destroy();
        value = null;
    });
}

export const sendMessage = (text) => {
    // Commands
    if (text.startsWith('+')) { // Next page
        const lastQuery = BooruService.queries.at(-1);
        BooruService.fetch(`${lastQuery.realTagList.join(' ')} ${lastQuery.page + 1}`)
    }
    else if (text.startsWith('/')) {
        if (text.startsWith('/clear')) clearChat();
        else if (text.startsWith('/safe')) {
            BooruService.nsfw = false;
            const message = SystemMessage(`Switched to safe mode`, '/safe', booruView)
            booruContent.add(message);
            booruContent.show_all();
            booruContent.attribute.map.set(Date.now(), message);
        }
        else if (text.startsWith('/lewd')) {
            BooruService.nsfw = true;
            const message = SystemMessage(`Tiddies enabled`, '/lewd', booruView)
            booruContent.add(message);
            booruContent.show_all();
            booruContent.attribute.map.set(Date.now(), message);
        }
        else if (text.startsWith('/mode')) {
            const mode = text.slice(text.indexOf(' ') + 1);
            BooruService.mode = mode;
            const message = SystemMessage(`Changed provider to ${BooruService.providerName}`, '/mode', booruView)
            booruContent.add(message);
            booruContent.show_all();
            booruContent.attribute.map.set(Date.now(), message);
        }
        else if (text.startsWith('/next')) {
            sendMessage('+')
        }
    }
    else BooruService.fetch(text);
}



/*
 * CUSTOM FUNCTIONS - These make most of the Szurubooru API requests
 */

function logToFile(...messages) { // custom function to log some output to ~/.cache/ags/log.txt
    const logFilePath = GLib.get_user_cache_dir() + "/ags/log.txt";
    const logMessage = `[${new Date().toISOString()}] ${messages.join(" ")}\n`;

    try {
        GLib.file_set_contents(logFilePath, GLib.file_get_contents(logFilePath)[1] + logMessage);
    } catch {
        GLib.file_set_contents(logFilePath, logMessage); // Create file if it doesn't exist
    }
}

async function addToPool(poolId, postId) {

    // First get pool version (required for data)
    try {
        const poolResponse = await Utils.fetch(`http://localhost:8080/api/pool/${poolId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${await getAPIKey()}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        });

        if (!poolResponse.ok) {
            const errorText = await poolResponse.text();
            logToFile("Failed to fetch pool data:", errorText);
            throw new Error(`Error fetching pool data: ${poolResponse.status}`);
        }

        const poolData = await poolResponse.json();
        const postsList = poolData.posts;

        logToFile("Current post list:", JSON.stringify(postsList));

        const data = {
            version: poolData.version,
            posts: [...postsList.map(post => post.id), postId], // Append new postId using spread
        };

        // Now able to add new postId to poolId
        logToFile("Sending request to:", `http://localhost:8080/api/pool/${poolId}`);
        //logToFile("Pool version:", poolData.version);

        const response = await Utils.fetch(`http://localhost:8080/api/pool/${poolId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Token ${await getAPIKey()}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Convert data to JSON
        });
        logToFile("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text(); 
            logToFile("Error response:", errorText);
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        logToFile("Success:", JSON.stringify(responseData));
        return responseData; 

    } catch (error) {
        logToFile("Fetch error:", error);
        throw error;
    }
}



async function makeFavorite(postId) {
    try {
        logToFile("Sending request to:", `http://localhost:8080/api/post/${postId}/favorite`);
        
        const response = await Utils.fetch(`http://localhost:8080/api/post/${postId}/favorite`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${await getAPIKey()}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        logToFile("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text(); 
            logToFile("Error response:", errorText);
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        logToFile("Success:", JSON.stringify(responseData));
        return data; 

    } catch (error) {
        logToFile("Fetch error:", error);
        throw error;
    }
}

async function getAPIKey() {
    // Grabs system environment variable to set API Key
    try {
        const apiKey = await Utils.execAsync(['bash', '-c', "cat ~/Documents/szuru-api-key"]);
        return apiKey.trim();
    } catch (error) {
        console.error('Error fetching API key:', error);
        return null; 
    }
}


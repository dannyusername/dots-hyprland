#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"

switch() {
	imgpath=$1
	# read scale screenx screeny screensizey < <(hyprctl monitors -j | jq '.[] | select(.focused) | .scale, .x, .y, .height' | xargs)
	# cursorposx=$(hyprctl cursorpos -j | jq '.x' 2>/dev/null) || cursorposx=960
	# cursorposx=$(bc <<< "scale=0; ($cursorposx - $screenx) * $scale / 1")
	# cursorposy=$(hyprctl cursorpos -j | jq '.y' 2>/dev/null) || cursorposy=540
	# cursorposy=$(bc <<< "scale=0; ($cursorposy - $screeny) * $scale / 1")
	# cursorposy_inverted=$((screensizey - cursorposy))

	if [ -z "$imgpath" ]; then
		echo 'No image provided'
		exit 1
	fi

	# agsv1 run-js "wallpaper.set('')"
	# sleep 0.1 && agsv1 run-js "wallpaper.set('${imgpath}')" &
	swww img "$imgpath" --resize fit --transition-step 100 --transition-fps 120 \
		--transition-type fade --transition-angle 30 --transition-duration 1 \

  "$CONFIG_DIR"/scripts/color_generation/colorgen.sh "${imgpath}" --apply --smart
}

if [ "$1" == "--noswitch" ]; then
	imgpath=$(swww query | awk -F 'image: ' '{print $2}')
elif [[ "$1" ]]; then
	switch "$1"
else
  waypaper --backend none # Launch GUI
  imgpath=$(waypaper --list | jq -r '.[0].wallpaper')  # Extract wallpaper path
  switch "$imgpath"
fi

# Generate colors for ags n stuff
"$CONFIG_DIR"/scripts/color_generation/colorgen.sh "${imgpath}" --apply --smart

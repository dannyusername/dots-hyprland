#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"

switch() {
	imgpath=$1

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

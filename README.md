<div align="center">
    <h1>【 end_4's Hyprland dotfiles 】</h1>
    <h3></h3>
</div>

<div align="center">
    <h2>• overview •</h2>
    <h3></h3>
</div>

<div align="center">
    <h2>List of main changes:</h2>
    <h3></h3>
</div>

- Booru.js (.config/ags/services/booru.js)
    * end_4's script uses yande.re API. I modified it to instead use a local Szurubooru instance using its API.
    * Removed waifus panel and other boorus

- system.js (.config/ags/modules/bar/normal/system.js)
    * Using [fruitsaladchan's](https://gist.github.com/fruitsaladchan/a227e71098ef5914795061c73ed33866) tweak to allow battery and weather widgets at the same time

- Color changing scripts(.config/ags/scripts/color_generation)
    * switchwall.sh now uses waypaper (prettier GUI)
    * applycolor.sh - apply_hyprlock() function now uses sed to replace the path line in hyprlock.conf. Hyprlock now shows your wallpaper instead of a static color

<h3></h3>
  | Software | Purpose |
  | ------------- | ------------- |
  | [Hyprland](https://github.com/hyprwm/hyprland) | The compositor (for noobs, you can just call it a window manager) |
  | [AGS](https://github.com/Aylur/ags) | A GTK widget system, responsible for the status bar, sidebars, etc. |
  | [Fuzzel](https://mark.stosberg.com/fuzzel-a-great-dmenu-and-rofi-altenrative-for-wayland/) | For clipboard and emoji picker |


  - For a more comprehensive list of dependencies, see [scriptdata/dependencies.conf](https://github.com/end-4/dots-hyprland/blob/main/scriptdata/dependencies.conf)
</details>

<details> 
  <summary>Help improve these dotfiles!</summary>
    
   - Join the [discussions](https://github.com/end-4/dots-hyprland/discussions)
   - If you'd like to suggest fixes or a new widget, feel free to [open an issue](https://github.com/end-4/dots-hyprland/issues/new/choose)
</details>

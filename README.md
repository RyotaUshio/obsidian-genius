# Genius intergration plugin for Obsidian

## Features

- Search songs on Genius.com inside Obsidian
- Make a song note with highly customizable templates
- View a song description & annotations in the right sidebar of Obsidian
- Link the sidebar with the active song note
- Seamless integration with
  - Genius.com
  - Spotify (requires [Obsidian Spotify](https://github.com/RyotaUshio/obsidian-spotify) plugin)
  - SoundCloud
  - YouTube

## Installation 

[BRAT](https://github.com/TfTHacker/obsidian42-brat)

## Usage

### Search songs

Run the command **Search**. 

### Templates

Example:

```md
---
genius-id: "{{id}}"
title: "{{title}}"
artist: "[[{{primary_artist.name}}]]"
featured:
  - "{{featured_artists.map(artist => `[[${artist.name}]]`).join(', ')}}"
released: "{{release_date}}"
created: <% tp.date.now() %>
link: "{{url}}"
---
```

#### Show available variables for templates

Click the **%** icon at the top right of the sidebar. Then, a song object containing all the available variables (properties) is emitted to the [developer console](https://forum.obsidian.md/t/how-to-access-the-console/16703).

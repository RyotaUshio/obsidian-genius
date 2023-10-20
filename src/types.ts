export interface GeniusSearchResultItem {
    highlight: any[];
    index: string;
    type: string;
    result: Song
}

export interface SongSimplified {
    annotation_count: number,
    api_path: string,
    artist_names: string,
    full_title: string,
    header_image_thumbnail_url: string,
    header_image_url: string,
    id: number,
    lyrics_owner_id: number,
    lyrics_state: string,
    path: string,
    pyongs_count: number,
    relationships_index_url: string,
    release_date_components: any,
    release_date_for_display: string,
    release_date_with_abbreviated_month_for_display: string,
    song_art_image_thumbnail_url: string,
    song_art_image_url: string,
    stats: any,
    title: string,
    title_with_featured: string,
    url: string,
    featured_artists: Artist[],
    primary_artist: Artist,
}

export interface SongDetail {
    apple_music_id: string;
    apple_music_player_url: string;
    description: any;
    embed_content: string;
    featured_video: boolean;
    language: string;
    lyrics_placeholder_reason: any;
    recording_location: string;
    current_user_metadata: any;
    album: any;
    custom_performances: any;
    description_annotation: any;
    featured_artists: any;
    lyrics_marked_complete_by: any;
    lyrics_marked_staff_approved_by: any;
    media: any;
    producer_artists: any;
    song_relationships: any;
    translation_songs: any;
    verified_annotations_by: any;
    verified_contributors: any;
    verified_lyrics_by: any;
    writer_artists: any;

}

export type Song = SongSimplified & Partial<SongDetail>;

    export interface Artist {
    api_path: string;
    header_image_url: string;
    id: number;
    image_url: string;
    is_meme_verified: boolean;
    is_verified: boolean;
    name: string;
    url: string;
}

export type GeniusDOM = string | {
    tag: keyof HTMLElementTagNameMap | 'root';
    children?: GeniusDOM[];
}

declare module "obsidian" {
    interface App {
        saveLocalStorage(key: string, value: any): void;
        loadLocalStorage(key: string): any;
    }
}
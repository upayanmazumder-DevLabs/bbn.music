import { allowedImageFormats, ErrorMessage, getSecondary, RegisterAuthRefresh, sheetStack } from "shared/helper.ts";
import { appendBody, asRef, asRefRecord, Box, Color, Content, createFilePicker, css, DateInput, DialogContainer, DropDown, Empty, FullWidthSection, Grid, Image, Label, PrimaryButton, SecondaryButton, SheetHeader, Spinner, TextAreaInput, TextInput, WebGenTheme } from "webgen/mod.ts";
import { templateArtwork } from "../../assets/imports.ts";
import { DynaNavigation } from "../../components/nav.ts";
import genres from "../../data/genres.json" with { type: "json" };
import language from "../../data/language.json" with { type: "json" };
import { API, ArtistRef, Song, stupidErrorAlert, zArtistTypes } from "../../spec/mod.ts";
import { uploadArtwork } from "./data.ts";
import { pages } from "./validator.ts";
import { EditArtistsDialog, ManageSongs } from "./views/table.ts";

await RegisterAuthRefresh();

document.adoptedStyleSheets.push(css`
    body {
        background: linear-gradient(139.46deg, #f19d2d 6.59%, #db5721 101.73%) no-repeat center center fixed !important;
    }
`);

const params = new URLSearchParams(location.search);

if (!params.has("id")) {
    alert("ID is missing");
    location.href = "/c/music";
}
const dropId = params.get("id")!;

export const creationState = asRefRecord({
    _id: <string> dropId,
    gtin: <string | undefined> undefined,
    title: <string | undefined> undefined,
    release: <string | undefined> undefined,
    language: <string | undefined> undefined,
    artists: <ArtistRef[]> [],
    primaryGenre: <string | undefined> undefined,
    secondaryGenre: <string | undefined> undefined,
    compositionCopyright: <string | undefined> undefined,
    soundRecordingCopyright: <string | undefined> undefined,
    artwork: <string | undefined> undefined,
    artworkData: <string | undefined> undefined,
    uploadingSongs: <Record<string, number>[]> [],
    songs: <Song[]> [],
    comments: <string | undefined> undefined,
    page: 0,
    validationState: <string | undefined> undefined,
    disableCopyright: <boolean>true,
});
API.getIdByDropsByMusic({ path: { id: dropId } }).then(stupidErrorAlert)
    .then(async (drop) => {
        creationState.gtin.setValue(drop.gtin);
        creationState.title.setValue(drop.title);
        creationState.release.setValue(drop.release);
        creationState.language.setValue(drop.language);
        creationState.artists.setValue(drop.artists ?? [{ type: zArtistTypes.enum.PRIMARY, _id: null! }]);
        creationState.primaryGenre.setValue(drop.primaryGenre);
        creationState.secondaryGenre.setValue(drop.secondaryGenre);
        creationState.compositionCopyright.setValue(drop.compositionCopyright ?? "bbn.music");
        creationState.soundRecordingCopyright.setValue(drop.soundRecordingCopyright ?? "bbn.music");
        creationState.artwork.setValue(drop.artwork);
        creationState.artworkData.setValue(drop.artwork ? await API.getArtworkByDropByMusic({ path: { dropId } }).then((x) => URL.createObjectURL(x.data)) : templateArtwork);
        creationState.songs.setValue(drop.songs ?? []);
        creationState.comments.setValue(drop.comments);
        creationState.disableCopyright.setValue(!(drop.copyrightEditable ?? false))
    })
    .then(() => creationState.page.setValue(1));

const additionalDropInformation = Grid(
    SheetHeader("Additional Information", sheetStack),
    TextInput(creationState.gtin, "UPC/EAN"),
    TextInput(creationState.compositionCopyright, "Composition Copyright").setDisabled(creationState.disableCopyright),
    TextInput(creationState.soundRecordingCopyright, "Sound Recording Copyright").setDisabled(creationState.disableCopyright),
    PrimaryButton("Save").onClick(() => sheetStack.removeOne()),
).setGap();

const validator = (page: number) => async () => {
    const { error } = pages[page - 1].safeParse(Object.fromEntries(Object.entries(creationState).map(([key, state]) => [key, state.value])));
    if (error) {
        creationState.validationState.setValue(`${error.issues[0].path[0]}: ${error.issues[0].message}`);
        return;
    }

    if (page === 1 && creationState.release.value) {
        const releaseDate = new Date(creationState.release.value);
        releaseDate.setHours(0, 0, 0, 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const releaseDateLimit = new Date();
        releaseDateLimit.setHours(0, 0, 0, 0);
        releaseDateLimit.setDate(releaseDateLimit.getDate() + 14);

        if (releaseDate >= now && releaseDate <= releaseDateLimit) {
            sheetStack.addSheet(
                Grid(
                    SheetHeader("Release Date Notice", sheetStack),
                    Grid(
                        Label("Important: Your selected release date is within 14 days.").setTextSize("xl"),
                        Label("Please note that our partners require adequate processing time, and drops submitted with less than 14 days notice may not be available on all platforms by your target date.").setTextSize("lg"),
                        Grid(
                            SecondaryButton("Go Back").onClick(() => {
                                sheetStack.removeOne();
                                creationState.validationState.setValue(undefined);
                            }),
                            PrimaryButton("Proceed Anyway").onClick(async () => {
                                sheetStack.removeOne();
                                creationState.validationState.setValue(undefined);
                                await saveDrop();
                                creationState.page.setValue(page + 1);
                                creationState.validationState.setValue(undefined);
                            }),
                        ).setGap().setTemplateColumns("1fr 1fr"),
                    ).setGap(),
                ),
            );
            return;
        }
    }

    creationState.validationState.setValue(undefined);
    await saveDrop();
    creationState.page.setValue(page + 1);
    creationState.validationState.setValue(undefined);
};

async function saveDrop() {
    await API.patchIdByDropsByMusic({ path: { id: dropId }, body: Object.fromEntries(Object.entries(creationState).map(([key, state]) => [key, state.value])) });
}

const footer = (page: number) =>
    Grid(
        page == 1 ? SecondaryButton("Cancel").onClick(() => location.href = "/c/music") : SecondaryButton("Back").onClick(() => creationState.page.setValue(page - 1)),
        //TODO: utilize setInvalid on Inputs for better UX
        ErrorMessage(creationState.validationState).setMargin("0.4rem 0 0 0"),
        PrimaryButton("Next").onPromiseClick(validator(page)),
    )
        .setGap()
        .setTemplateColumns("auto 50% auto");

creationState.primaryGenre.listen((_, old) => {
    if (old !== undefined) {
        creationState.secondaryGenre.setValue(undefined);
    }
});

const wizard = creationState.page.map((page) => {
    if (page == 0) {
        return Spinner();
    } else if (page == 1) {
        return Grid(
            Grid(
                Label("Enter your Album details.").setFontWeight("bold").setTextSize("xl").setJustifySelf("center"),
                TextInput(creationState.title, "Title"),
                Grid(
                    DateInput(creationState.release, "Release Date"),
                    DropDown(Object.keys(language), creationState.language, "Language")
                        .setValueRender((key) => language[<keyof typeof language> key]),
                )
                    .setDynamicColumns(15)
                    .setGap(),
                PrimaryButton("Artists")
                    .onClick(() => sheetStack.addSheet(EditArtistsDialog(creationState.artists))),
                Label("Set your target Audience").setFontWeight("bold").setTextSize("xl").setJustifySelf("center"),
                Grid(
                    DropDown(Object.keys(genres), creationState.primaryGenre, "Primary Genre"),
                    //TODO: display as disabled if no primary genre is selected (webgen blocker)
                    DropDown(getSecondary(genres, creationState.primaryGenre) ?? [], creationState.secondaryGenre, "Secondary Genre"),
                )
                    .setGap()
                    .setDynamicColumns(15),
                PrimaryButton("Additional Information")
                    .onClick(() => sheetStack.addSheet(additionalDropInformation)),
            )
                .setGap()
                .setEvenColumns(1),
            footer(page),
        ).setGap();
    } else if (page == 2) {
        return Grid(
            creationState.artworkData.map((data) =>
                Grid(
                    Grid(
                        Empty(),
                        Label("Upload your Cover").setFontWeight("bold").setTextSize("xl").setJustifySelf("center"),
                        PrimaryButton("Manual Upload").setMaxWidth("max-content").setJustifySelf("end")
                            .onClick(() => createFilePicker(allowedImageFormats.join(",")).then((file) => uploadArtwork(dropId, file, creationState.artwork, creationState.artworkData))),
                    ).setTemplateColumns("1fr auto 1fr"),
                    data === "loading" ? Spinner() : Image(data!, "Drop Artwork").addStyle(css`
                        img {
                            width: 60%;
                            margin: 0 auto;
                        }
                    `),
                ).setGap()
            ),
            footer(page),
        ).setGap();
    } else if (page == 3) {
        return Grid(
            ManageSongs(creationState.songs, dropId, asRef(undefined)),
            footer(page),
        ).setGap();
    } else if (page == 4) {
        return Grid(
            Grid(
                Label("Thanks! That's everything we need.").setTextSize("xl").setFontWeight("bold").setJustifySelf("center"),
            ),
            Grid(
                TextAreaInput(creationState.comments, "Comments for Review Team, Beats/Samples used, Rights Information, etc."),
            ),
            Grid(
                SecondaryButton("Back").setJustifyContent("center").onClick(() => creationState.page.setValue(3)),
                PrimaryButton("Submit").onPromiseClick(async () => {
                    await saveDrop();

                    await API.postTypeByTypeByDropByMusic({
                        path: {
                            dropId,
                            type: "UNDER_REVIEW",
                        },
                    });

                    location.href = "/c/music";
                }).setJustifyContent("center"),
            ).setGap()
                .setTemplateColumns("1fr 1fr"),
        ).setGap();
    }
    return Empty();
});

appendBody(
    WebGenTheme(
        DialogContainer(sheetStack.visible(), sheetStack),
        Content(
            FullWidthSection(
                DynaNavigation("Music"),
            ),
            Box(wizard).setPadding("10% 5%"),
        ),
    ).setPrimaryColor(new Color("white")),
);

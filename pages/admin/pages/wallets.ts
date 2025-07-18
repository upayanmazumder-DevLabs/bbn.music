import { RegisterAuthRefresh } from "shared/helper.ts";
import { Box, Content, createCachedLoader, createIndexPaginationLoader, createPage, createRoute, Label, TextButton } from "webgen/mod.ts";
import { API, stupidErrorAlert } from "../../../spec/mod.ts";
import { WalletEntry } from "../entries.ts";

await RegisterAuthRefresh();

const loader = createCachedLoader(createIndexPaginationLoader({
    limit: 30,
    loader: (offset, limit) => API.getWalletsByAdmin({ query: { offset, limit } }).then(stupidErrorAlert),
}));

createPage(
    {
        route: createRoute({
            path: "/admin?list=wallets",
            events: {
                onLazyInit: async () => {
                    await loader.next();
                },
            },
        }),
        label: "Wallets",
        weight: 11,
    },
    Content(
        loader.items.map((wallets) => wallets.map((wallet) => WalletEntry(wallet))),
        Box(loader.hasMore.map((hasMore) =>
            hasMore
                ? TextButton("Load More").onPromiseClick(async () => {
                    await loader.next();
                })
                : Label("No more wallets")
        )),
    ),
);

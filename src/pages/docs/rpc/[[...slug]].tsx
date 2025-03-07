import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import ContentApi from "@/utils/contentApi";
import { serializeMarkdown } from "@/utils/markdown";
import { RECORD_GROUPS } from "@/constants/developerContentConfig";

import HTMLHead from "@/components/HTMLHead";
import DocsLayout from "@/components/developers/DocsLayout";

import { useEffect, useState } from "react";
import classNames from "classnames";
import { useTranslation } from "next-i18next";
import styles from "@/components/developers/DevelopersContentPage/DevelopersContentPage.module.scss";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer/MarkdownRenderer";
import Link from "next/link";
import { useRouter } from "next/router";

import ArrowLeft from "@@/public/src/img/icons/ArrowLeft.inline.svg";
import GithubIcon from "@@/public/src/img/footer/github.inline.svg";
import DocsNavSidebar from "@/components/developers/DocsNavSidebar";
import { InferGetStaticPropsType } from "next";
import { SidebarToggleButton } from "@/components/developers/DevelopersContentPage/SidebarToggleButton";
import { TableOfContents } from "@/components/developers/DevelopersContentPage/TableOfContents";
import { PageNav } from "@/components/developers/DevelopersContentPage/PageNav";

import {
  DocSideBySide,
  DocLeftSide,
  Parameter,
  Field,
  Values,
  DocRightSide,
} from "@/components/shared/MarkdownRenderer/DocSideBySide";
import { PageBreadcrumbs } from "@/components/developers/DevelopersContentPage/PageBreadcrumbs";

/**
 * Define custom MDX components for use with this MarkdownRender
 */
const rpcMDXComponents = {
  DocSideBySide,
  DocLeftSide,
  Parameter,
  Field,
  Values,
  DocRightSide,
};

export default function DeveloperRPCDocs({
  navData,
  record,
  source,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation("common");

  // state tracking for the sidebar nav (primarily for mobile)
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // track and auto close the toc menu on nav change
  const router = useRouter();
  useEffect(() => {
    setSidebarVisible(false);
  }, [router]);

  return (
    <DocsLayout>
      <HTMLHead
        title={
          record?.seoTitle || record?.title ? record.title : "RPC Documentation"
        }
        description={record?.description || ""}
        socialShare={
          !!record.href ? `/opengraph/developers${record.href}` : undefined
        }
      />

      <div className={classNames(styles["developers-content-page"])}>
        <div className="row">
          <section
            className="col-lg-8 order-2 p-0"
            style={{
              flex: "1 1 auto",
            }}
          >
            <div
              className="col-lg-6 row m-0"
              style={{
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              {record.hideTableOfContents !== true && (
                <div
                  className={classNames(
                    styles["developers-content-page__sidebarGroup"],
                    styles["developers-content-page__rightSidebarGroup"],
                  )}
                >
                  <TableOfContents
                    id="docs-toc"
                    title={t("shared.general.toc")}
                    currentPath={router.asPath}
                    content={record.body}
                    githubPath={record._raw.sourceFilePath}
                  />
                </div>
              )}

              <article
                className={classNames(
                  "order-2 col-lg-6 px-6 m-0",
                  styles["developers-content-page__article"],
                )}
              >
                <PageBreadcrumbs breadcrumbs={record.breadcrumbs} />

                <h1>
                  <Link href={record?.href || "."}>{record.title}</Link>
                </h1>

                <div
                  className={styles["developers-content-page__metadataHeader"]}
                >
                  <div
                    className={
                      styles["developers-content-page__metadataHeader__details"]
                    }
                  >
                    {/* Last edited on:{" "} */}
                  </div>

                  {!!record.hideTableOfContents && (
                    <Link
                      href={ContentApi.computeGitHubFileUrl(
                        record._raw.sourceFilePath,
                      )}
                      target="_blank"
                      className={
                        styles["developers-content-page__simpleButton"]
                      }
                    >
                      <GithubIcon width="18" height="18" />
                      <span>{t("shared.general.edit-page")}</span>
                      <ArrowLeft style={{ transform: "rotate(180deg)" }} />
                    </Link>
                  )}
                </div>

                <MarkdownRenderer
                  source={source}
                  components={rpcMDXComponents}
                />
                <nav>
                  <PageNav nav={{ next: record.next, prev: record.prev }} />
                </nav>
              </article>
            </div>
          </section>

          <aside
            className={classNames(
              styles["developers-content-page__sidebar"],
              "col-md-12 col-lg-3 order-1",
            )}
          >
            <SidebarToggleButton
              visible={sidebarVisible}
              setVisible={setSidebarVisible}
            />

            <DocsNavSidebar
              currentPath={router.asPath}
              docsNav={navData}
              className={
                !sidebarVisible
                  ? styles["developers-content-page__sidebar__hidden"]
                  : styles["developers-content-page__sidebar__active"]
              }
            />
          </aside>
        </div>
      </div>
    </DocsLayout>
  );
}

export async function getStaticPaths(
  {
    /*locales,*/
  },
) {
  // const localeParam = locales.join("&locale=");

  // locate the current record being viewed (via the correctly formatted api route)
  const pathData = await ContentApi.getPathsForGroup("docs/rpc");

  return {
    paths: pathData
      // removing the `isExternal=true` items prevents local redirects via our site
      ?.filter(
        (record) =>
          !(record?.isExternal == true && !!record.href) &&
          record.href?.startsWith("/docs/rpc"),
      )
      .map((item) => {
        return {
          params: {
            // note: `item.href` is expected to have a prefix of "/docs/rpc/"
            // note: the additional regex `?` allows for the root `/docs/rpc` route to exist (without a trailing slash)
            slug: item.href
              .toLowerCase()
              .replaceAll(/^(\/docs\/rpc\/?)?/gi, "")
              .split("/"),
          },
        };
      }),
    fallback: "blocking",
  };
}

export async function getStaticProps({ params, locale }) {
  const { slug = [] } = params;

  // define the base route for the requested content
  const route = `${RECORD_GROUPS.rpc}/${slug.join("/")}`;

  // locate the current record being viewed (via the correctly formatted api route)
  const record = await ContentApi.getSingleRecord(route, locale);

  // ensure the content record was found
  if (!record || !record.href) {
    return {
      notFound: true,
    };
  }

  // handle record redirects for altRoutes and external links
  const redirect = ContentApi.recordRedirectPayload(record, route, locale);
  if (!!redirect) return redirect;

  // serialize the content via mdx
  const source = await serializeMarkdown(
    record.body,
    `${locale}-${record?.id}`,
  );

  // load the nav data
  const navData = await ContentApi.getNavForGroup("docs/rpc", locale);

  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      record,
      source,
      navData,
    },
    // revalidate: 60,
  };
}

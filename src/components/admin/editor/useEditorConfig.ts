import { usePlateEditor } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'

// Standard Plate plugins
import { BoldPlugin, ItalicPlugin, StrikethroughPlugin, CodePlugin } from '@udecode/plate-basic-marks/react'
import { HeadingPlugin } from '@udecode/plate-heading/react'
import { BlockquotePlugin } from '@udecode/plate-block-quote/react'
import { HorizontalRulePlugin } from '@udecode/plate-horizontal-rule/react'
import { ListPlugin } from '@udecode/plate-list/react'
import { ImagePlugin } from '@udecode/plate-media/react'

import {
  ELEMENT_CALLOUT,
  ELEMENT_BOX,
  ELEMENT_HERO,
  ELEMENT_COLUMNS,
  ELEMENT_COLUMN,
  ELEMENT_HERO_SECTION,
  ELEMENT_HERO_SLIDER,
  ELEMENT_CV_TIMELINE,
  ELEMENT_PROJECT_BENTO,
  ELEMENT_SHOWCASE,
  ELEMENT_GRID,
  ELEMENT_BANNER,
  ELEMENT_DONATE,
  ELEMENT_SLIDER,
  ELEMENT_PRODUCTS,
  ELEMENT_ARTISTS_GRID,
  ELEMENT_UPCOMING_EVENTS,
  ELEMENT_DIRECTIVE_RAW,
} from './types'

// Standard leaf + element components
import {
  BoldLeaf,
  ItalicLeaf,
  StrikethroughLeaf,
  CodeLeaf,
  HeadingElement,
  BlockquoteElement,
  HorizontalRuleElement,
  ImageElement,
  LinkElement,
  UnorderedListElement,
  OrderedListElement,
  ListItemElement,
  ListItemContentElement,
  CodeBlockElement,
  CodeLineElement,
  ParagraphElement,
} from './elements/StandardElements'

// Custom directive element components
import { CalloutElement } from './elements/CalloutElement'
import { BoxElement } from './elements/BoxElement'
import { HeroElement } from './elements/HeroElement'
import { ColumnsElement } from './elements/ColumnsElement'
import { ColumnElement } from './elements/ColumnElement'
import { HeroSectionElement } from './elements/HeroSectionElement'
import { HeroSliderElement } from './elements/HeroSliderElement'
import { CvTimelineElement } from './elements/CvTimelineElement'
import { ProjectBentoElement } from './elements/ProjectBentoElement'
import { ShowcaseElement } from './elements/ShowcaseElement'
import { GridElement } from './elements/GridElement'
import { BannerElement } from './elements/BannerElement'
import { DonateElement } from './elements/DonateElement'
import { SliderElement } from './elements/SliderElement'
import { ProductsElement } from './elements/ProductsElement'
import { ArtistsGridElement } from './elements/ArtistsGridElement'
import { UpcomingEventsElement } from './elements/UpcomingEventsElement'
import { DirectiveRawElement } from './elements/DirectiveRawElement'

import { createCalloutPlugin } from './plugins/calloutPlugin'
import { createBoxPlugin } from './plugins/boxPlugin'
import { createHeroPlugin } from './plugins/heroPlugin'
import { createColumnsPlugin, createColumnPlugin } from './plugins/columnsPlugin'
import { createHeroSectionPlugin } from './plugins/heroSectionPlugin'
import { createHeroSliderPlugin } from './plugins/heroSliderPlugin'
import { createCvTimelinePlugin } from './plugins/cvTimelinePlugin'
import { createProjectBentoPlugin } from './plugins/projectBentoPlugin'
import { createShowcasePlugin } from './plugins/showcasePlugin'
import { createOrganicGridPlugin } from './plugins/organicGridPlugin'
import { createBannerPlugin } from './plugins/bannerPlugin'
import { createDonatePlugin } from './plugins/donatePlugin'
import { createSliderPlugin } from './plugins/sliderPlugin'
import { createProductsPlugin } from './plugins/productsPlugin'
import { createArtistsGridPlugin } from './plugins/artistsGridPlugin'
import { createUpcomingEventsPlugin } from './plugins/upcomingEventsPlugin'
import { createDirectiveRawPlugin } from './plugins/directiveRawPlugin'

export function useEditorConfig(initialValue: TElement[]) {
  const editor = usePlateEditor({
    plugins: [
      // Standard formatting plugins — marks need render.leaf for visual rendering
      HeadingPlugin,
      BoldPlugin.extend({ render: { leaf: BoldLeaf } }),
      ItalicPlugin.extend({ render: { leaf: ItalicLeaf } }),
      StrikethroughPlugin.extend({ render: { leaf: StrikethroughLeaf } }),
      CodePlugin.extend({ render: { leaf: CodeLeaf } }),
      BlockquotePlugin,
      HorizontalRulePlugin,
      ListPlugin,
      ImagePlugin,

      // Custom directive plugins
      createCalloutPlugin(),
      createBoxPlugin(),
      createHeroPlugin(),
      createColumnsPlugin(),
      createColumnPlugin(),
      createHeroSectionPlugin(),
      createHeroSliderPlugin(),
      createCvTimelinePlugin(),
      createProjectBentoPlugin(),
      createShowcasePlugin(),
      createOrganicGridPlugin(),
      createBannerPlugin(),
      createDonatePlugin(),
      createSliderPlugin(),
      createProductsPlugin(),
      createArtistsGridPlugin(),
      createUpcomingEventsPlugin(),
      createDirectiveRawPlugin(),
    ],
    override: {
      components: {
        // Standard element components
        p: ParagraphElement,
        h1: HeadingElement,
        h2: HeadingElement,
        h3: HeadingElement,
        h4: HeadingElement,
        h5: HeadingElement,
        h6: HeadingElement,
        blockquote: BlockquoteElement,
        hr: HorizontalRuleElement,
        img: ImageElement,
        a: LinkElement,
        ul: UnorderedListElement,
        ol: OrderedListElement,
        li: ListItemElement,
        lic: ListItemContentElement,
        code_block: CodeBlockElement,
        code_line: CodeLineElement,

        // Custom directive element components
        [ELEMENT_CALLOUT]: CalloutElement,
        [ELEMENT_BOX]: BoxElement,
        [ELEMENT_HERO]: HeroElement,
        [ELEMENT_COLUMNS]: ColumnsElement,
        [ELEMENT_COLUMN]: ColumnElement,
        [ELEMENT_HERO_SECTION]: HeroSectionElement,
        [ELEMENT_HERO_SLIDER]: HeroSliderElement,
        [ELEMENT_CV_TIMELINE]: CvTimelineElement,
        [ELEMENT_PROJECT_BENTO]: ProjectBentoElement,
        [ELEMENT_SHOWCASE]: ShowcaseElement,
        [ELEMENT_GRID]: GridElement,
        [ELEMENT_BANNER]: BannerElement,
        [ELEMENT_DONATE]: DonateElement,
        [ELEMENT_SLIDER]: SliderElement,
        [ELEMENT_PRODUCTS]: ProductsElement,
        [ELEMENT_ARTISTS_GRID]: ArtistsGridElement,
        [ELEMENT_UPCOMING_EVENTS]: UpcomingEventsElement,
        [ELEMENT_DIRECTIVE_RAW]: DirectiveRawElement,
      },
    },
    value: initialValue,
  }, [])

  return editor
}

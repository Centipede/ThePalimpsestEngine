<template>
  <div class="section-study">

    <p v-if="loading" class="section-study__status">Loading…</p>
    <p v-else-if="error" class="section-study__status section-study__status--error">{{ error }}</p>
    <template v-else-if="data">
      <Teleport to=".nav-mid-title-portal">
        <div class="nav-portal-content">
          <sl-breadcrumb>
            <sl-breadcrumb-item v-for="crumb in breadcrumbs.slice(1)" :key="crumb.path">
              <router-link :to="crumb.path" class="breadcrumb-link">{{ crumb.title }}</router-link>
            </sl-breadcrumb-item>
          </sl-breadcrumb>
          <sl-badge variant="neutral" pill >{{ data.section.path_coded ?? data.section.path_full }}</sl-badge>
        </div>
      </Teleport>

      <div class="section-study__toolbar">

        <div class="toolbar-infoleft" />

        <div class="tools-left">
          <sl-dropdown stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Summaries</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('info-left', $event)">
              <sl-menu-item
                  v-for="item in availableInfoLeft"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
                  :disabled="item.disabled"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        </div>

        <div class="tools-mid">
          <sl-button-group>
            <sl-button
                size="small"
                :variant="showTableOfContents ? 'primary' : 'default'"
                @click="showTableOfContents = !showTableOfContents"
                title="Toggle Table of Contents"
            >
              <sl-icon name="diagram-3"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showSummary ? 'primary' : 'default'"
                @click="showSummary = !showSummary"
                title="Toggle Summary"
            >
              <sl-icon name="card-heading"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showSegmentsOverview ? 'primary' : 'default'"
                @click="showSegmentsOverview = !showSegmentsOverview"
                title="Toggle Segments Overview"
            >
              <sl-icon name="hdd-stack"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showEntities ? 'primary' : 'default'"
                @click="showEntities = !showEntities"
                title="Toggle Entities"
            >
              <sl-icon name="people"></sl-icon>
            </sl-button>
          </sl-button-group>

          <sl-divider vertical></sl-divider>

            <sl-button-group>
              <sl-button
                  size="small"
                  :variant="organiseMode === 'linear' ? 'primary' : 'default'"
                  @click="organiseMode = 'linear'"
                  title="Linear View"
              >
                <sl-icon name="list"></sl-icon>
              </sl-button>
              <sl-button
                  v-if="data.section.essentials?.outline?.segments?.paragraph_segments?.length"
                  size="small"
                  :variant="organiseMode === 'segmented' ? 'primary' : 'default'"
                  @click="organiseMode = 'segmented'"
                  title="Segmented View"
              >
                <sl-icon name="layers-half"></sl-icon>
              </sl-button>
            </sl-button-group>

            <sl-button-group>
              <sl-tooltip content="Expand All Segments">
                <sl-icon-button
                    name="plus-square"
                    label="Expand All Segments"
                    :disabled="organiseMode !== 'segmented'"
                    @click="expandAllSegments"
                ></sl-icon-button>
              </sl-tooltip>
              <sl-tooltip content="Collapse All Segments">
                <sl-icon-button
                    name="dash-square"
                    label="Collapse All Segments"
                    :disabled="organiseMode !== 'segmented'"
                    @click="collapseAllSegments"
                ></sl-icon-button>
              </sl-tooltip>
            </sl-button-group>

          <sl-divider vertical></sl-divider>

          <sl-button-group>
            <sl-tooltip content="Expand All Paragraphs">
              <sl-icon-button name="arrows-expand" label="Expand All Paragraphs" @click="expandAllParagraphs"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Collapse All Paragraphs">
              <sl-icon-button name="arrows-collapse" label="Collapse All Paragraphs" @click="collapseAllParagraphs"></sl-icon-button>
            </sl-tooltip>
          </sl-button-group>

          <sl-dropdown stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Highlights</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('highlights', $event)">
              <sl-menu-item
                  v-for="item in availableHighlights"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
                  :disabled="item.disabled"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>

        </div>

        <div class="tools-right">
          <sl-dropdown size="small" stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Entities</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('info-right', $event)">
              <sl-menu-item
                  v-for="item in availableInfoRight"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
                  :disabled="item.disabled"
                  :class="{ 'toolbar-menu-item--extraordinary': item.extraordinary }"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>

          <sl-divider vertical></sl-divider>

          <sl-button-group>
            <sl-button size="small" @click="openCorpusDialog('ask')">
              <sl-icon slot="prefix" name="chat-dots"></sl-icon>
              Ask
            </sl-button>
            <sl-button size="small" @click="openCorpusDialog('talk')">
              <sl-icon slot="prefix" name="chat-quote"></sl-icon>
              Talk
            </sl-button>
            <sl-button size="small" @click="showNotesDrawer = true">
              <sl-icon slot="prefix" name="sticky"></sl-icon>
              Notes
            </sl-button>
          </sl-button-group>

        </div>

        <div class="toolbar-inforight" />

      </div>

      <Teleport v-if="isStaff" to=".admin-tools-portal">
        <div class="section-admin-actions-portal">
          <h3 class="portal-section-title">Section Admin</h3>

          <sl-details summary="Gather Info">
            <div class="admin-actions-group">
              <sl-button variant="warning" size="small" :loading="isGathering" @click="gatherSectionInfo">
                <sl-icon slot="prefix" name="gear"></sl-icon>
                Gather info
              </sl-button>

              <div class="portal-group-title">Section</div>
              <div class="portal-checkbox-group">
                <sl-checkbox size="small" :checked="gatherOptions.section.essentials.includes('digest')" @sl-change="toggleGatherOption('section', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
                <sl-checkbox size="small" :checked="gatherOptions.section.essentials.includes('outline')" @sl-change="toggleGatherOption('section', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

                <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

                <sl-checkbox
                  v-for="facetType in bookFacetTypes"
                  :key="facetType"
                  size="small"
                  :checked="gatherOptions.section.facets.includes(facetType)"
                  @sl-change="toggleGatherOption('section', 'facets', facetType, $event.target.checked)"
                >
                  {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
                </sl-checkbox>
              </div>

              <div class="portal-group-title">Content</div>
              <div class="portal-checkbox-group">
                <sl-checkbox size="small" :checked="gatherOptions.content.essentials.includes('digest')" @sl-change="toggleGatherOption('content', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
                <sl-checkbox size="small" :checked="gatherOptions.content.essentials.includes('outline')" @sl-change="toggleGatherOption('content', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

                <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

                <sl-checkbox
                  v-for="facetType in bookFacetTypes"
                  :key="facetType"
                  size="small"
                  :checked="gatherOptions.content.facets.includes(facetType)"
                  @sl-change="toggleGatherOption('content', 'facets', facetType, $event.target.checked)"
                >
                  {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
                </sl-checkbox>
              </div>
            </div>
          </sl-details>

          <sl-details summary="Remove Records">
            <div class="admin-actions-group">
              <sl-button variant="danger" size="small" :loading="isRemoving" @click="removeRecords">
                <sl-icon slot="prefix" name="trash"></sl-icon>
                Remove
              </sl-button>

              <div class="portal-group-title">Section</div>
              <div class="portal-checkbox-group">
                <sl-checkbox size="small" :checked="deleteOptions.section.essentials.includes('digest')" @sl-change="toggleDeleteOption('section', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
                <sl-checkbox size="small" :checked="deleteOptions.section.essentials.includes('outline')" @sl-change="toggleDeleteOption('section', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

                <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

                <sl-checkbox
                  v-for="facetType in bookFacetTypes"
                  :key="facetType"
                  size="small"
                  :checked="deleteOptions.section.facets.includes(facetType)"
                  @sl-change="toggleDeleteOption('section', 'facets', facetType, $event.target.checked)"
                >
                  {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
                </sl-checkbox>
              </div>

              <div class="portal-group-title">Content</div>
              <div class="portal-checkbox-group">
                <sl-checkbox size="small" :checked="deleteOptions.content.essentials.includes('digest')" @sl-change="toggleDeleteOption('content', 'essentials', 'digest', $event.target.checked)">Digest</sl-checkbox>
                <sl-checkbox size="small" :checked="deleteOptions.content.essentials.includes('outline')" @sl-change="toggleDeleteOption('content', 'essentials', 'outline', $event.target.checked)">Outline</sl-checkbox>

                <div v-if="bookFacetTypes.length > 0" class="portal-divider"></div>

                <sl-checkbox
                  v-for="facetType in bookFacetTypes"
                  :key="facetType"
                  size="small"
                  :checked="deleteOptions.content.facets.includes(facetType)"
                  @sl-change="toggleDeleteOption('content', 'facets', facetType, $event.target.checked)"
                >
                  {{ facetsStore.getFacetByPluralName(facetType)?.name || facetType }}
                </sl-checkbox>
              </div>
            </div>
          </sl-details>
        </div>
      </Teleport>

      <Teleport v-if="isStaff" to=".admin-info-portal">
        <div class="section-admin-info-portal">
          <div class="admin-jobs-header">
            <h3 class="portal-section-title">Active Jobs</h3>
            <sl-icon-button name="arrow-clockwise" label="Reload" @click="fetchActiveBackgroundTask"></sl-icon-button>
          </div>

          <div v-if="activeBackgroundTask" class="active-task">
            <div class="active-task__goal">{{ activeBackgroundTask.goal }}</div>
            <div v-if="activeBackgroundTask.title" class="active-task__title">{{ activeBackgroundTask.title }}</div>

            <div v-for="job in activeBackgroundTask.jobs" :key="job.id" class="active-job">
              <div class="active-job__phase">{{ job.gather_info_status.phase }}</div>
              <div class="active-job__stats">
                <div v-if="job.gather_info_status.remaining_blocks?.length">
                  Blocks: {{ job.gather_info_status.remaining_blocks.length }} left
                </div>
                <div v-if="job.gather_info_status.remaining_facets?.length">
                  Facets: {{ job.gather_info_status.remaining_facets.length }} left
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-active-task">No active background tasks</div>

          <sl-divider></sl-divider>

          <h3 class="portal-section-title">Section Insight</h3>
          <div class="section-insight-badges">
            <div class="insight-group">
              <div class="insight-group__label">Essentials</div>
              <div class="insight-group__badges">
                <sl-tooltip v-if="data?.section.essentials?.digest" content="Digest Present" hoist>
                  <sl-badge variant="success" pill size="small" class="interactive-badge" @click="toggleInfo('digest', 'digest', data.section.essentials.digest)">D</sl-badge>
                </sl-tooltip>
                <sl-tooltip v-if="data?.section.essentials?.outline" content="Outline Present" hoist>
                  <sl-badge variant="success" pill size="small" class="interactive-badge" @click="toggleInfo('outline', 'outline', data.section.essentials.outline)">O</sl-badge>
                </sl-tooltip>
                <span v-if="!data?.section.essentials?.digest && !data?.section.essentials?.outline" class="no-badges">-</span>
              </div>
            </div>

            <div v-for="group in sectionFindingGroups" :key="group.bucket" class="insight-group">
              <div class="insight-group__label">Findings ({{ group.bucket }})</div>
              <div class="insight-group__badges">
                <sl-tooltip v-for="badge in group.badges" :key="badge.key" :content="badge.facet.name" hoist>
                  <sl-badge variant="neutral" pill size="small" class="facet-badge interactive-badge" @click="toggleInfo('occurrences', badge.key, badge)">
                    {{ badge.facet.symbol }}
                  </sl-badge>
                </sl-tooltip>
                <span v-if="group.badges.length === 0" class="no-badges">-</span>
              </div>
            </div>
          </div>

          <transition name="expand">
            <div v-if="expandedInfoType && expandedInfoType !== 'context'" class="expanded-info-container">
              <DigestInfo
                  v-if="expandedInfoType === 'digest'"
                  :digest="expandedInfoData"
              />

              <OutlineInfo
                  v-else-if="expandedInfoType === 'outline'"
                  :outline="expandedInfoData"
              />

              <div v-else class="occurrence-info-stack">
                <FindingOccurrenceInfo
                    v-for="occ in expandedInfoData.occurrences"
                    :key="occ.id"
                    :occurrence="occ"
                    :label="expandedInfoData.facet.name"
                    :symbol="expandedInfoData.facet.symbol"
                    :bucket="expandedInfoData.bucket"
                    :render-method="facetsStore.getRenderMethodByPluralName(expandedInfoData.facet.machine_name_plural)"
                />
              </div>
            </div>
          </transition>

          <sl-divider></sl-divider>

          <h3 class="portal-section-title">Block Insight</h3>
          <div class="section-insight-badges">
            <div class="insight-group">
              <div class="insight-group__label">Contexts</div>
              <div class="insight-group__badges">
                <sl-tooltip v-for="badge in blockContextBadges" :key="badge.key" :content="badge.facet.name" hoist>
                  <sl-badge variant="neutral" pill size="small" class="facet-badge interactive-badge" @click="toggleInfo('context', badge.key, badge)">
                    {{ badge.facet.symbol }}
                  </sl-badge>
                </sl-tooltip>
                <span v-if="blockContextBadges.length === 0" class="no-badges">-</span>
              </div>
            </div>
          </div>

          <transition name="expand">
            <div v-if="expandedInfoType === 'context'" class="expanded-info-container">
              <FindingContextInfo
                  :contexts="expandedInfoData.contexts"
                  :label="expandedInfoData.facet.name"
                  :symbol="expandedInfoData.facet.symbol"
              />
            </div>
          </transition>

          <sl-divider></sl-divider>

          <h3 class="portal-section-title">Processing Manifest</h3>
          <div v-if="processingManifest" class="pm-manifest">
            <div class="insight-group">
              <div class="insight-group__label">Essentials</div>
              <div class="insight-group__badges">
                <sl-tooltip content="Digest" hoist>
                  <sl-badge :variant="isEssentialCompleted('digest') ? 'success' : 'neutral'" pill size="small">D</sl-badge>
                </sl-tooltip>
                <sl-tooltip content="Outline" hoist>
                  <sl-badge :variant="isEssentialCompleted('outline') ? 'success' : 'neutral'" pill size="small">O</sl-badge>
                </sl-tooltip>
              </div>
            </div>

            <div class="insight-group">
              <div class="insight-group__label">Facets</div>
              <div class="insight-group__badges">
                <sl-tooltip v-for="facetType in bookFacetTypes" :key="facetType" :content="facetsStore.getFacetByPluralName(facetType)?.name || facetType" hoist>
                  <sl-badge
                    :variant="isFacetCompleted(facetType) ? 'success' : 'neutral'"
                    pill
                    size="small"
                    class="facet-badge"
                  >
                    {{ facetsStore.getFacetByPluralName(facetType)?.symbol || facetType[0].toUpperCase() }}
                  </sl-badge>
                </sl-tooltip>
                <span v-if="bookFacetTypes.length === 0" class="no-badges">-</span>
              </div>
            </div>

            <div class="insight-group">
              <div class="insight-group__label">Contexts</div>
              <div class="insight-group__badges">
                <sl-tooltip
                  v-for="facetType in bookFacetTypes"
                  :key="facetType"
                  :content="`${facetsStore.getFacetByPluralName(facetType)?.name || facetType}: ${isFacetContextCompleted(facetType) ? 'clustered' : 'not clustered'}`"
                  hoist
                >
                  <sl-badge
                    :variant="isFacetContextCompleted(facetType) ? 'success' : 'neutral'"
                    pill
                    size="small"
                    class="facet-badge"
                  >
                    {{ facetsStore.getFacetByPluralName(facetType)?.symbol || facetType[0].toUpperCase() }}
                  </sl-badge>
                </sl-tooltip>
                <span v-if="bookFacetTypes.length === 0" class="no-badges">-</span>
              </div>
            </div>

            <sl-details summary="Processing Log" class="pm-log-details">
              <div class="pm-log">
                <div v-for="(entry, index) in formattedLog" :key="index" class="pm-log-entry" :class="{ 'pm-log-entry--error': entry.errors?.length > 0 }">
                  <div class="pm-log-entry__header">
                    <span class="pm-log-entry__time">{{ new Date(entry.when).toLocaleString() }}</span>
                  </div>
                  <div v-if="Object.keys(entry.notes || {}).length > 0" class="pm-log-entry__notes">
                    <div v-for="(val, key) in entry.notes" :key="key" class="pm-log-note">
                      <span class="pm-log-note__key">{{ key }}:</span>
                      <span class="pm-log-note__val">{{ val }}</span>
                    </div>
                  </div>
                  <div v-if="entry.errors?.length > 0" class="pm-log-entry__errors">
                    <div v-for="(err, errIdx) in entry.errors" :key="errIdx" class="pm-log-error">
                      {{ err }}
                    </div>
                  </div>
                </div>
                <div v-if="formattedLog.length === 0" class="pm-log-empty">No log entries</div>
              </div>
            </sl-details>
          </div>
          <div v-else class="no-manifest">No manifest available</div>
        </div>
      </Teleport>

      <TableOfContents
          v-if="showTableOfContents && props.bookStructure"
          :book-structure="props.bookStructure"
          :machine-name="props.machineName"
          :rootSectionPF="props.sectionPath"
          :findings="data?.section.findings"
          :essentials="data?.section.essentials"
      />

      <SectionInformation
          v-if="showSummary"
          :machine-name="props.machineName"
          :section-path="props.sectionPath"
          :findings="data?.section.findings"
          :essentials="data?.section.essentials"
      />
      <SectionOutline v-if="showSegmentsOverview && data.section.essentials?.outline?.segments" :outline="data.section.essentials.outline.segments"/>
      <SectionFindings v-if="showEntities && Object.keys(sectionContexts).length" :facets="sectionContexts" v-model:open-finding-ids="openFindingIds" :selected-occurrence="selectedOccurrence" :active-facet-types="activeFacetTypes" @refresh="fetchSection" @jump-to-block="handleJumpToBlock"/>

      <CorpusStudyDialog
          v-model:open="corpusDialog.open"
          :type="corpusDialog.type"
          :initial-authors="initialAuthors"
          :initial-books="initialBooks"
          :initial-sections="initialSections"
          @conversation-created="handleConversationCreated"
          @qa-created="handleQACreated"
      />

      <StudyWorkspaceDialog
          v-model:open="activeItem.open"
          :type="activeItem.type"
          :loading="activeItem.loading"
          :error="activeItem.error"
          :data="activeItem.data"
          :linking-ref="activeItem.linkingRef"
          @title-updated="handleTitleUpdated"
          @pin-updated="handlePinUpdated"
          @note-updated="handleNoteUpdated"
          @turn-note-updated="handleTurnNoteUpdated"
          @turn-added="handleTurnAdded"
          @references-updated="handleReferencesUpdated"
      />

      <sl-drawer
        label="Section Notes"
        :open="showNotesDrawer"
        @sl-after-hide.self="showNotesDrawer = false"
        placement="end"
        style="--size: 400px;"
      >
        <SectionNoteView
          v-if="data && props.bookStructure"
          :section="data.section"
          :book="props.bookStructure.book"
          :visible="showNotesDrawer"
        />
        <sl-button slot="footer" variant="primary" @click="showNotesDrawer = false">Close</sl-button>
      </sl-drawer>

      <header v-if="data.contents.length>0" class="section-study__header">
        <h1 class="section-study__title">{{ data.section.title_text }}</h1>
        <div class="section-pages">
          <template v-if="data.section.pageinfo?.first_page">
            p. {{ data.section.pageinfo.first_page?.page_name }}{{ data.section.pageinfo?.last_page && data.section.pageinfo.last_page.page_name !== data.section.pageinfo.first_page.page_name ? ' - ' + data.section.pageinfo?.last_page.page_name : '' }}
          </template>
        </div>
      </header>

      <article class="section-study__content">
        <router-view v-if="route.params.block_id"></router-view>
        <template v-else>
          <template v-if="organiseMode === 'linear'">
            <ContentBlockView
                v-for="(block, index) in data.contents"
                :key="block.path_id"
                :block="block"
                :index="index"
                :machine-name="props.machineName"
                :section-path="props.sectionPath"
                :fold-trigger="paragraphFoldTrigger"
                :available-highlights="availableHighlights"
                :active-finding-contexts="activeFindingContexts"
                :active-facet-types="activeFacetTypes"
                :border-color="blockBorderColors[index]"
                :block-link="getBlockLink(block.path_id)"
                @occurrence-selected="handleOccurrenceSelected"
            />
          </template>

          <template v-else-if="organiseMode === 'segmented'">
            <div class="segments-container">
              <sl-details
                  v-for="(seg, idx) in segmentedData.segments"
                  :key="idx"
                  class="segment-details"
                  :open="!!openSegments[idx]"
                  @sl-show="toggleSegment(idx, true)"
                  @sl-hide="toggleSegment(idx, false)"
              >
                <div slot="summary" class="segment-summary-header">
                  <div class="segment-header">
                    <sl-badge variant="success" pill class="segment-range-badge">{{ seg.ranges.join(', ') }}</sl-badge>
                    <span class="segment-caption">{{ seg.caption }}</span>
                  </div>
                  <p v-if="seg.description && !openSegments[idx]" class="segment-description">{{ seg.description }}</p>
                </div>

                <div class="segment-content">
                  <template
                      v-for="(entry, blockIdx) in seg.blocks"
                      :key="entry.block.path_id"
                  >
                    <div
                        v-if="blockIdx > 0 && entry.index - seg.blocks[blockIdx - 1].index > 1"
                        class="skipped-blocks"
                    >
                      <i>
                        … skipped {{ skippedBlockCount(entry.index, seg.blocks[blockIdx - 1].index) }}
                        {{ skippedBlockCount(entry.index, seg.blocks[blockIdx - 1].index) === 1 ? 'paragraph' : 'paragraphs' }} …
                      </i>
                    </div>

                    <ContentBlockView
                        :block="entry.block"
                        :index="entry.index"
                        :machine-name="props.machineName"
                        :section-path="props.sectionPath"
                        :fold-trigger="paragraphFoldTrigger"
                        :available-highlights="availableHighlights"
                        :active-finding-contexts="activeFindingContexts"
                        :active-facet-types="activeFacetTypes"
                        :border-color="blockBorderColors[entry.index]"
                        :block-link="getBlockLink(entry.block.path_id)"
                        @occurrence-selected="handleOccurrenceSelected"
                    />
                  </template>
                </div>
              </sl-details>

              <div v-if="segmentedData.orphans.length > 0" class="orphans-section">
                <h3 class="orphans-title">Other Paragraphs</h3>
                <ContentBlockView
                    v-for="entry in segmentedData.orphans"
                    :key="entry.block.path_id"
                    :block="entry.block"
                    :index="entry.index"
                    :machine-name="props.machineName"
                    :section-path="props.sectionPath"
                    :fold-trigger="paragraphFoldTrigger"
                    :available-highlights="availableHighlights"
                    :active-finding-contexts="activeFindingContexts"
                    :active-facet-types="activeFacetTypes"
                    :border-color="blockBorderColors[entry.index]"
                    :block-link="getBlockLink(entry.block.path_id)"
                    @occurrence-selected="handleOccurrenceSelected"
                />
              </div>
            </div>
          </template>
        </template>

      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch, provide, nextTick} from 'vue';
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import {apiFetch} from '../api';
import type {
  SectionContentResponse,
  BookStructure,
  Section,
  FindingOccurrence,
  FindingContext,
  ActiveFindingContext,
  FacetQuery,
  FindingContextMap,
  BackgroundTask,
} from '../types/library';
import type { Conversation, ConversationRef, ConversationTurn, QuestionAnswer, QuestionAnswerRef } from '../types/study';
import SectionNoteView from './studynotes/SectionNoteView.vue';
import SectionInformation from './SectionInformation.vue';
import SectionOutline from './SectionOutline.vue';
import SectionFindings from './SectionFindings.vue';
import ContentBlockView from './ContentBlockView.vue';
import TableOfContents from './TableOfContents.vue';
import CorpusStudyDialog from './corpus/CorpusStudyDialog.vue';
import StudyWorkspaceDialog from './studyworkspaces/StudyWorkspaceDialog.vue';
import DigestInfo from './admin/info/DigestInfo.vue';
import OutlineInfo from './admin/info/OutlineInfo.vue';
import FindingContextInfo from './admin/info/FindingContextInfo.vue';
import FindingOccurrenceInfo from './admin/info/FindingOccurrenceInfo.vue';
import {useLibraryStore} from "../stores/library.ts";
import {useFacetsStore} from "../stores/facets.ts";
import type {FoldTrigger, ToolbarToggle} from "../types/view_state.ts";

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
}>();

const { isStaff } = useAuth();
const route = useRoute();

const facetsStore = useFacetsStore();

const data = ref<SectionContentResponse | null>(null);
provide('sectionData', data);
const loading = ref(true);
const error = ref('');
const organiseMode = ref<'linear' | 'segmented'>('linear');
const openSegments = ref<Record<number, boolean>>({});
const showNotesDrawer = ref(false);
const paragraphFoldTrigger = ref<FoldTrigger>({ command: 'expand-all', count: 0 });
const activeBackgroundTask = ref<BackgroundTask | null>(null);
const selectedOccurrence = ref<FindingOccurrence | null>(null);
const activeFacetTypes = ref<Set<string>>(new Set());

// 'digest' | 'outline' | 'occurrences' (section-level findings) | 'context' (block-level)
const expandedInfoType = ref<string | null>(null);
// Identifies the badge that opened the panel ('digest', 'One:places', 'context:people', ...).
// Keyed rather than compared by payload identity: the badge payloads are rebuilt
// by a computed on every render, so identity comparison would never match.
const expandedInfoKey = ref<string | null>(null);
const expandedInfoData = ref<any>(null);

function toggleInfo(type: string, key: string, payload: any) {
  if (expandedInfoKey.value === key) {
    expandedInfoType.value = null;
    expandedInfoKey.value = null;
    expandedInfoData.value = null;
  } else {
    expandedInfoType.value = type;
    expandedInfoKey.value = key;
    expandedInfoData.value = payload;
  }
}

const processingManifest = computed(() => data.value?.section.info?.processing_manifest);

function isEssentialCompleted(key: string) {
  return processingManifest.value?.completed.essentials.includes(key) ?? false;
}

function isFacetCompleted(key: string) {
  return processingManifest.value?.completed.facets.includes(key) ?? false;
}

// Clustering of block findings into FindingContexts is tracked separately from the
// facet extraction itself: a facet can be fully extracted while its contexts are not
// yet grouped. The field is optional, since manifests written before it existed omit it.
function isFacetContextCompleted(key: string) {
  return processingManifest.value?.completed.facet_contexts?.includes(key) ?? false;
}

const formattedLog = computed(() => {
  if (!processingManifest.value?.log) return [];
  return [...processingManifest.value.log].reverse();
});

const bookFacetTypes = computed(() => {
  if (!props.bookStructure?.book.facet_applications_cascaded) return [];
  const types = props.bookStructure.book.facet_applications_cascaded
    .map(fa => facetsStore.getFacetById(fa.facet as number)?.machine_name_plural)
    .filter((t): t is string => !!t);
  return Array.from(new Set(types)).sort();
});

const openFindingIds = ref<Record<number, boolean>>({});
const findingColorsMap = ref<Record<number, string>>({});

const SEGMENT_COLORS = [
  'var(--sl-color-blue-500)',
  'var(--sl-color-red-500)',
  'var(--sl-color-green-500)',
  'var(--sl-color-amber-500)',
  'var(--sl-color-purple-500)',
  'var(--sl-color-pink-500)',
  'var(--sl-color-orange-500)',
  'var(--sl-color-teal-500)',
];

const FINDING_COLORS = [
  '#FFB3BA', // Pastel Red
  '#BAFFC9', // Pastel Green
  '#BAE1FF', // Pastel Blue
  '#FFFFBA', // Pastel Yellow
  '#FFDFBA', // Pastel Orange
  '#E0BBE4', // Pastel Purple
  '#957DAD', // Muted Purple
  '#D291BC', // Muted Pink
  '#FEC8D8', // Light Pink
  '#FFDFD3', // Peach
];

const rootSegmentsWithColors = computed(() => {
  if (!data.value?.segments) return [];
  return data.value.segments
      .filter(s => s.is_root)
      .map((s, index) => ({
        ...s,
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length]
      }));
});

const blockBorderColors = computed(() => {
  const mapping: Record<number, string> = {};
  if (!data.value?.contents) return mapping;

  const paragraphSegments = data.value.section.essentials?.outline?.segments?.paragraph_segments;
  if (paragraphSegments && paragraphSegments.length > 0) {
    paragraphSegments.forEach((seg, index) => {
      const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
      const indices = parseRanges(seg.ranges);
      indices.forEach(i => {
        mapping[i] = color;
      });
    });
    return mapping;
  }

  const roots = rootSegmentsWithColors.value;

  data.value.contents.forEach((_, index) => {
    const matchingSegment = roots.find(s => {
      const first = s.coverage_spec.paragraph_first ?? -1;
      const last = s.coverage_spec.paragraph_last ?? -1;
      return index >= first && index <= last;
    });

    if (matchingSegment) {
      mapping[index] = matchingSegment.color;
    }
  });

  return mapping;
});

const availableInfoLeft = ref<ToolbarToggle[]>([
  { name: 'General', type: 'general', checked: true, extraordinary: false},
  { name: 'Annotations (#3+#17)', type: 'annotations', checked: true, extraordinary: false },
  { name: 'Notes (Study #10)', type: 'notes', checked: true, extraordinary: false },
]);

const availableHighlights = ref<ToolbarToggle[]>([
  { name: 'Summary Quotes', type: 'summary-quotes', checked: true, extraordinary: false },
]);

/**
 * Concern: which facets are represented in this section at all.
 * Unions the section-level finding buckets with the facets of every block
 * occurrence, so the "Entities" toolbar can disable facets with no presence
 * here. Counts a facet as used even if its occurrences are orphaned (no
 * context) - the facet is still represented in the text.
 */
const usedFacetTypes = computed<Set<string>>(() => {
  const used = new Set<string>();

  const findings = data.value?.section.findings;
  if (findings) {
    for (const bucket of ['contexts', 'section_one', 'section_few', 'section_many'] as const) {
      Object.keys(findings[bucket] ?? {}).forEach(pluralName => used.add(pluralName));
    }
  }

  // Occurrences are the only place carrying a SINGULAR of_facet; map it to
  // plural to match the section buckets and the toolbar keys.
  data.value?.contents.forEach(block => {
    block.findings?.occurrences?.forEach(occ => {
      if (!occ.of_facet) return;
      const facet = facetsStore.getFacetBySingularName(occ.of_facet);
      if (facet) used.add(facet.machine_name_plural);
    });
  });

  return used;
});

/**
 * Concern: which FindingContexts to show for this section - only the real
 * ones the API delivered. Orphaned block occurrences are deliberately not
 * synthesised into contexts here.
 */
const sectionContexts = computed<FindingContextMap>(() => data.value?.section.findings?.contexts ?? {});

const activeFindingContexts = computed<ActiveFindingContext[]>(() => {
  const active: ActiveFindingContext[] = [];
  const facets = sectionContexts.value;

  Object.values(facets).flat().forEach(context => {
    if (openFindingIds.value[context.id]) {
      if (!findingColorsMap.value[context.id]) {
        const assignedColors = Object.values(findingColorsMap.value);
        const nextColor = FINDING_COLORS.find(c => !assignedColors.includes(c)) || FINDING_COLORS[active.length % FINDING_COLORS.length];
        findingColorsMap.value[context.id] = nextColor;
      }
      active.push({ context, color: findingColorsMap.value[context.id] });
    }
  });
  return active;
});

watch(activeFindingContexts, (newActive) => {
  const current = availableHighlights.value;
  const nonFindingHighlights = current.filter(h => !h.type.startsWith('finding-'));
  const findingHighlights = newActive.map(afc => {
    const type = `finding-${afc.context.id}`;
    const existing = current.find(h => h.type === type);
    return {
      name: afc.context.name,
      type,
      checked: existing ? existing.checked : true,
      extraordinary: false,
    };
  });
  availableHighlights.value = [...nonFindingHighlights, ...findingHighlights];
}, { immediate: true });

const availableInfoRight = computed<ToolbarToggle[]>(() => {
  const cascadedApps = props.bookStructure?.book.facet_applications_cascaded ?? [];
  const assignedFacetIds = [...new Set(cascadedApps.map(app => app.facet).filter((id): id is number => id !== null))];
  const appliedFacetIds = [...usedFacetTypes.value].map( namePlural => facetsStore.getFacetByPluralName(namePlural)?.id || null );
  const allFacetIds = [...new Set([...assignedFacetIds, ...appliedFacetIds])].filter(id => id !== null).sort();

  return allFacetIds
    .map(id => facetsStore.getFacetById(id))
    .filter((fq): fq is FacetQuery => !!fq)
    .map(fq => ({
      name: fq.name,
      type: fq.machine_name_plural,
      extraordinary: !assignedFacetIds.includes(fq.id),
      checked: activeFacetTypes.value.has(fq.machine_name_plural),
      disabled: !usedFacetTypes.value.has(fq.machine_name_plural)
    }));
});

type ToolbarToggleGroup = 'info-left' | 'highlights' | 'info-right';

const store = useLibraryStore();
const author = computed(() => store.getAuthorById(props.bookStructure?.book.by_author ?? null));
const pageTitle = computed(() => `${data.value?.section.path_coded ?? props.sectionPath} | ${props.bookStructure?.book.abbrev ?? props.machineName} | ${author.value?.abbrev ?? ''}`);
useHead({
  title: pageTitle
});

// Clicking an entity in a paragraph toggles its context: the first click
// activates it (expands the finding in the Entities panel and highlights its
// quotes), a second click on any occurrence of that same context switches it
// off again. Deliberately no viewport motion either way.
function handleOccurrenceSelected(occ: FindingOccurrence) {
  const contextId = occ.of_context;

  if (contextId && openFindingIds.value[contextId]) {
    openFindingIds.value = { ...openFindingIds.value, [contextId]: false };
    selectedOccurrence.value = null;
    return;
  }

  selectedOccurrence.value = occ;
  if (contextId) {
    openFindingIds.value = { ...openFindingIds.value, [contextId]: true };
  }
  showEntities.value = true;
}

// The opposite direction: from an occurrence in the Entities panel down to the
// content block it was found in.
async function handleJumpToBlock(occ: FindingOccurrence) {
  const pathId = occ.in_block_pi;
  if (!pathId) return;

  // In segmented mode the target block may sit inside a collapsed sl-details.
  if (organiseMode.value === 'segmented') {
    const idx = segmentedData.value.segments.findIndex(
        seg => seg.blocks.some(b => b.block.path_id === pathId)
    );
    if (idx > -1 && !openSegments.value[idx]) {
      toggleSegment(idx, true);
    }
  }

  await nextTick();
  scrollToBlockWhenReady(pathId);
}

// sl-details un-hides its body as the open animation starts, so poll a few
// frames until the block is actually laid out before scrolling to it.
function scrollToBlockWhenReady(pathId: string, attempts = 20) {
  const el = document.getElementById(`block-${pathId}`);
  if (el && el.getClientRects().length > 0) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (attempts > 0) {
    requestAnimationFrame(() => scrollToBlockWhenReady(pathId, attempts - 1));
  }
}

function handleToolbarSelect(group: ToolbarToggleGroup, event: Event) {
  const selectedItem = (event as CustomEvent<{ item: HTMLElement }>).detail.item as HTMLElement & {
    value: string;
    checked: boolean;
  };

  setToolbarToggle(group, selectedItem.value, selectedItem.checked);
}

function setToolbarToggle(
    group: ToolbarToggleGroup,
    type: string,
    checked: boolean
) {
  const update = (items: ToolbarToggle[]) =>
      items.map(item => item.type === type ? { ...item, checked } : item);

  if (group === 'info-left') {
    availableInfoLeft.value = update(availableInfoLeft.value);
  } else if (group === 'highlights') {
    availableHighlights.value = update(availableHighlights.value);
  } else {
    const next = new Set(activeFacetTypes.value);
    if (checked) {
      next.add(type);
    } else {
      next.delete(type);
    }
    activeFacetTypes.value = next;
  }
}

const showTableOfContents = ref(true);
const showSummary = ref(false);
const showSegmentsOverview = ref(false);
const showEntities = ref(false);

const isGathering = ref(false);
const isRemoving = ref(false);
interface GranularDeleteOptions {
  essentials: string[];
  facets: string[];
}

interface DeleteOptions {
  section: GranularDeleteOptions;
  content: GranularDeleteOptions;
}

const deleteOptions = ref<DeleteOptions>({
  section: { essentials: [], facets: [] },
  content: { essentials: [], facets: [] },
});

const gatherOptions = ref<DeleteOptions>({
  section: { essentials: [], facets: [] },
  content: { essentials: [], facets: [] },
});

function toggleDeleteOption(type: 'section' | 'content', category: 'essentials' | 'facets', value: string, checked: boolean) {
  const options = deleteOptions.value[type][category];
  if (checked) {
    if (!options.includes(value)) {
      options.push(value);
    }
  } else {
    const index = options.indexOf(value);
    if (index > -1) {
      options.splice(index, 1);
    }
  }
}

function toggleGatherOption(type: 'section' | 'content', category: 'essentials' | 'facets', value: string, checked: boolean) {
  const options = gatherOptions.value[type][category];
  if (checked) {
    if (!options.includes(value)) {
      options.push(value);
    }
  } else {
    const index = options.indexOf(value);
    if (index > -1) {
      options.splice(index, 1);
    }
  }
}

const corpusDialog = ref({
  open: false,
  type: 'ask' as 'ask' | 'talk'
});

interface ActiveItem {
  type: 'conversation' | 'question_answer' | null;
  loading: boolean;
  error: string | null;
  data: Conversation | QuestionAnswer | null;
  linkingRef: ConversationRef | QuestionAnswerRef | null;
  open: boolean;
}

const activeItem = ref<ActiveItem>({
  type: null,
  loading: false,
  error: null,
  data: null,
  linkingRef: null,
  open: false
});

const initialAuthors = computed(() => {
  if (!props.bookStructure) return [];
  const authors = [props.bookStructure.book.by_author];
  if (props.bookStructure.book.by_author1) authors.push(props.bookStructure.book.by_author1);
  if (props.bookStructure.book.by_author2) authors.push(props.bookStructure.book.by_author2);
  if (props.bookStructure.book.by_author3) authors.push(props.bookStructure.book.by_author3);
  return authors;
});

const initialBooks = computed(() => {
  if (!props.bookStructure) return [];
  return [props.bookStructure.book.id];
});

const initialSections = computed(() => {
  if (!data.value?.section) return [];
  return [data.value.section.id];
});

function openCorpusDialog(type: 'ask' | 'talk') {
  corpusDialog.value.type = type;
  corpusDialog.value.open = true;
}

function toggleSegment(index: number, isOpen: boolean) {
  openSegments.value[index] = isOpen;
}

function expandAllParagraphs() {
  paragraphFoldTrigger.value = { command: 'expand-all', count: paragraphFoldTrigger.value.count + 1 };
}

function collapseAllParagraphs() {
  paragraphFoldTrigger.value = { command: 'collapse-all', count: paragraphFoldTrigger.value.count + 1 };
}

function expandAllSegments() {
  segmentedData.value.segments.forEach((_, idx) => {
    openSegments.value[idx] = true;
  });
}

function collapseAllSegments() {
  segmentedData.value.segments.forEach((_, idx) => {
    openSegments.value[idx] = false;
  });
}

function skippedBlockCount(currentIndex: number, previousIndex: number) {
  return Math.max(0, currentIndex - previousIndex - 1);
}

const getBlockLink = (blockPathId: string) => {
  return `/study/${props.machineName}/section/${props.sectionPath}/content/${blockPathId}`;
};

async function jsonOrNull<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  return text ? JSON.parse(text) as T : null;
}

async function fetchActiveBackgroundTask() {
  if (!isStaff.value) return;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/active_background_task/`);
    if (res.ok) {
      activeBackgroundTask.value = await jsonOrNull<BackgroundTask>(res);
    }
  } catch (e) {
    console.error('Failed to fetch active background task:', e);
  }
}

interface SectionFindingBadge {
  key: string;
  bucket: string;
  facet: FacetQuery;
  occurrences: FindingOccurrence[];
}

/**
 * Concern: SECTION INSIGHT - the occurrences the section itself owns, per
 * bucket. These are NOT the block-level finding contexts; a badge here expands
 * the section_one/section_few/section_many occurrences that produced it, with
 * their extracted_data. One row per bucket; 'Many' is only shown once the
 * backend starts filling it.
 */
const sectionFindingGroups = computed<{ bucket: string; badges: SectionFindingBadge[] }[]>(() => {
  const findings = data.value?.section.findings;

  const buildBadges = (bucket: 'section_one' | 'section_few' | 'section_many', label: string) => {
    const map = findings?.[bucket] ?? {};
    return Object.entries(map)
      .flatMap(([pluralName, occurrences]): SectionFindingBadge[] => {
        if (!occurrences?.length) return [];
        const facet = facetsStore.getFacetByPluralName(pluralName);
        if (!facet) return [];
        return [{ key: `${label}:${pluralName}`, bucket: label, facet, occurrences }];
      })
      .sort((a, b) => a.facet.id - b.facet.id);
  };

  const groups = [
    { bucket: 'One', badges: buildBadges('section_one', 'One') },
    { bucket: 'Few', badges: buildBadges('section_few', 'Few') },
  ];

  const many = buildBadges('section_many', 'Many');
  if (many.length > 0) groups.push({ bucket: 'Many', badges: many });

  return groups;
});

/**
 * Concern: BLOCK INSIGHT - the finding contexts, which group occurrences across
 * content blocks. They are delivered on the section only because a context can
 * span several blocks.
 */
const blockContextBadges = computed<{ key: string; facet: FacetQuery; contexts: FindingContext[] }[]>(() => {
  return Object.entries(sectionContexts.value)
    .flatMap(([pluralName, contexts]) => {
      if (!contexts?.length) return [];
      const facet = facetsStore.getFacetByPluralName(pluralName);
      if (!facet) return [];
      return [{ key: `context:${pluralName}`, facet, contexts }];
    })
    .sort((a, b) => a.facet.id - b.facet.id);
});

async function gatherSectionInfo() {
  isGathering.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/maintenance/job/start_gather_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatherOptions.value)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await fetchActiveBackgroundTask();
    gatherOptions.value = {
      section: { essentials: [], facets: [] },
      content: { essentials: [], facets: [] },
    };
  } catch (e) {
    console.error('Failed to start gather info job:', e);
  } finally {
    isGathering.value = false;
  }
}

async function removeRecords() {
  isRemoving.value = true;
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/maintenance/remove_records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deleteOptions.value)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await fetchSection();
    deleteOptions.value = {
      section: { essentials: [], facets: [] },
      content: { essentials: [], facets: [] },
    };
  } catch (e) {
    console.error('Failed to remove records:', e);
  } finally {
    isRemoving.value = false;
  }
}

const parseRanges = (ranges: string[]): Set<number> => {
  const indices = new Set<number>();
  for (const range of ranges) {
    if (!range) continue;
    const parts = range.split('-').map(s => parseInt(s.trim(), 10));
    if (parts.length === 1) {
      if (!isNaN(parts[0])) indices.add(parts[0] - 1);
    } else if (parts.length === 2) {
      const [start, end] = parts;
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) indices.add(i - 1);
      }
    }
  }
  return indices;
};

const segmentedData = computed(() => {
  if (!data.value) return {segments: [], orphans: []};

  const paragraphSegments = data.value.section.essentials?.outline?.segments?.paragraph_segments;
  if (!paragraphSegments || paragraphSegments.length === 0) {
    return {segments: [], orphans: data.value.contents.map( (block, index) => ({block, index}))};
  }

  const allSegmentedIndices = new Set<number>();
  const segments = paragraphSegments.map(seg => {
    const indices = parseRanges(seg.ranges);
    indices.forEach(i => allSegmentedIndices.add(i));
    const blocks = data.value!.contents
        .map((block, index) => ({ block, index }))
        .filter(({ index }) => indices.has(index));

    return {
      ...seg,
      blocks
    };
  });

  const orphans = data.value.contents
      .map((block, index) => ({ block, index }))
      .filter(({ index }) => !allSegmentedIndices.has(index));

  return {segments, orphans};
});


const breadcrumbs = computed(() => {
  if (!props.bookStructure) return [];
  const mainFlow = props.bookStructure.flows.find(f => f.name === 'main');
  const tree = mainFlow?.tree;
  if (!tree) return [];

  const crumbs = [];
  crumbs.push({
    title: props.bookStructure.book.title,
    path: `/study/${props.machineName}`
  });

  const parts = props.sectionPath.split('.').slice(1);

  let currentTree: Section | null = tree;

  let currentPath = '';
  for (const part of parts) {
    if (currentPath) currentPath += '.';
    currentPath += part;

    const found: Section | undefined = currentTree?.subsections?.find(s => s.path_id === part);
    if (found) {
      crumbs.push({
        title: found.title_text,
        path: `/study/${props.machineName}/section/${found.path_full}`
      });
      currentTree = found;
    } else {
      break;
    }
  }

  return crumbs;
});

async function handleConversationCreated(id: number) {
  corpusDialog.value.open = false;
  activeItem.value = {
    type: 'conversation',
    loading: true,
    error: null,
    data: null,
    linkingRef: null,
    open: true
  };

  try {
    if (props.bookStructure && data.value?.section) {
      const sectionRef = {
        in_book: null,
        in_book_mn: props.bookStructure.book.machine_name,
        in_section: data.value.section.id,
        in_section_pf: data.value.section.path_full,
        is_pinned: false,
        order_key: 0
      };

      try {
        await apiFetch(`/teststudy/api/v1/conversation/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ references: [sectionRef] })
        });
      } catch (patchError) {
        console.error('Failed to attach section reference to conversation', patchError);
      }
    }

    const response = await apiFetch(`/teststudy/api/v1/conversation/${id}/`);
    if (response.ok) {
      const conv: Conversation = await response.json();
      activeItem.value.data = conv;
      if (conv.references && conv.references.length > 0) {
        activeItem.value.linkingRef = conv.references[0];
      }
    } else {
      activeItem.value.error = `Error: ${response.statusText}`;
    }
  } catch (e) {
    activeItem.value.error = (e as Error).message;
  } finally {
    activeItem.value.loading = false;
  }
}

async function handleQACreated(id: number) {
  corpusDialog.value.open = false;
  activeItem.value = {
    type: 'question_answer',
    loading: true,
    error: null,
    data: null,
    linkingRef: null,
    open: true
  };

  try {
    if (props.bookStructure && data.value?.section) {
      const sectionRef = {
        in_book: null,
        in_book_mn: props.bookStructure.book.machine_name,
        in_section: data.value.section.id,
        in_section_pf: data.value.section.path_full,
        is_pinned: false,
        order_key: 0
      };

      try {
        await apiFetch(`/teststudy/api/v1/question-answer/${id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ references: [sectionRef] })
        });
      } catch (patchError) {
        console.error('Failed to attach section reference to QA', patchError);
      }
    }

    const response = await apiFetch(`/teststudy/api/v1/question-answer/${id}/`);
    if (response.ok) {
      const qa: QuestionAnswer = await response.json();
      activeItem.value.data = qa;
      if (qa.references && qa.references.length > 0) {
        activeItem.value.linkingRef = qa.references[0];
      }
    } else {
      activeItem.value.error = `Error: ${response.statusText}`;
    }
  } catch (e) {
    activeItem.value.error = (e as Error).message;
  } finally {
    activeItem.value.loading = false;
  }
}

function handleTitleUpdated(newTitle: string) {
  if (!activeItem.value.data || !activeItem.value.type) return;

  activeItem.value.data.title = newTitle;

  const itemId = activeItem.value.data.id;
  const itemType = activeItem.value.type;

  if (data.value?.section) {
    if (itemType === 'conversation' && data.value.section.conversations) {
      const ref = data.value.section.conversations.find(c => c.of_conversation === itemId);
      if (ref) ref.title = newTitle;
    } else if (itemType === 'question_answer' && data.value.section.question_answers) {
      const ref = data.value.section.question_answers.find(qa => qa.of_questionanswer === itemId);
      if (ref) ref.title = newTitle;
    }
  }

  if (props.bookStructure) {
    if (itemType === 'conversation' && props.bookStructure.book.conversations) {
      const ref = props.bookStructure.book.conversations.find(c => c.of_conversation === itemId);
      if (ref) ref.title = newTitle;
    } else if (itemType === 'question_answer' && props.bookStructure.book.question_answers) {
      const ref = props.bookStructure.book.question_answers.find(qa => qa.of_questionanswer === itemId);
      if (ref) ref.title = newTitle;
    }

    const updateTitleInTree = (sections: Section[]) => {
      for (const section of sections) {
        if (itemType === 'conversation' && section.conversations) {
          const ref = section.conversations.find(c => c.of_conversation === itemId);
          if (ref) ref.title = newTitle;
        } else if (itemType === 'question_answer' && section.question_answers) {
          const ref = section.question_answers.find(qa => qa.of_questionanswer === itemId);
          if (ref) ref.title = newTitle;
        }
        if (section.subsections?.length) {
          updateTitleInTree(section.subsections);
        }
      }
    };

    props.bookStructure.flows.forEach(flow => {
      if (flow.tree) {
        updateTitleInTree([flow.tree]);
      }
    });
  }
}

function handlePinUpdated(isPinned: boolean) {
  if (!activeItem.value.data || !activeItem.value.type || !activeItem.value.linkingRef) return;

  activeItem.value.linkingRef.is_pinned = isPinned;

  const refId = activeItem.value.linkingRef.id;
  const itemType = activeItem.value.type;

  if ((activeItem.value.data as any).references) {
    const ref = (activeItem.value.data as any).references.find((r: any) => r.id === refId);
    if (ref) ref.is_pinned = isPinned;
  }

  if (data.value?.section) {
    if (itemType === 'conversation' && data.value.section.conversations) {
      const ref = data.value.section.conversations.find(c => c.id === refId);
      if (ref) ref.is_pinned = isPinned;
    } else if (itemType === 'question_answer' && data.value.section.question_answers) {
      const ref = data.value.section.question_answers.find(qa => qa.id === refId);
      if (ref) ref.is_pinned = isPinned;
    }
  }

  if (props.bookStructure) {
    if (itemType === 'conversation' && props.bookStructure.book.conversations) {
      const ref = props.bookStructure.book.conversations.find(c => c.id === refId);
      if (ref) ref.is_pinned = isPinned;
    } else if (itemType === 'question_answer' && props.bookStructure.book.question_answers) {
      const ref = props.bookStructure.book.question_answers.find(qa => qa.id === refId);
      if (ref) ref.is_pinned = isPinned;
    }

    const updatePinInTree = (sections: Section[]) => {
      for (const section of sections) {
        if (itemType === 'conversation' && section.conversations) {
          const ref = section.conversations.find(c => c.id === refId);
          if (ref) ref.is_pinned = isPinned;
        } else if (itemType === 'question_answer' && section.question_answers) {
          const ref = section.question_answers.find(qa => qa.id === refId);
          if (ref) ref.is_pinned = isPinned;
        }
        if (section.subsections?.length) {
          updatePinInTree(section.subsections);
        }
      }
    };

    props.bookStructure.flows.forEach(flow => {
      if (flow.tree) {
        updatePinInTree([flow.tree]);
      }
    });
  }
}

function handleNoteUpdated(payload: { field: 'question_note' | 'answer_note', value: string | null }) {
  if (!activeItem.value.data || activeItem.value.type !== 'question_answer') return;
  (activeItem.value.data as QuestionAnswer)[payload.field] = payload.value;
}

function handleTurnNoteUpdated(payload: { turnId: number, field: 'question_note' | 'answer_note' | 'question_summary' | 'answer_summary', value: string | null }) {
  if (!activeItem.value.data || activeItem.value.type !== 'conversation') return;
  const turn = (activeItem.value.data as Conversation).turns?.find(t => t.id === payload.turnId);
  if (turn) {
    turn[payload.field] = payload.value;
  }
}

function handleTurnAdded(newTurn: ConversationTurn) {
  if (!activeItem.value.data || activeItem.value.type !== 'conversation') return;
  const conv = activeItem.value.data as Conversation;
  if (!conv.turns) {
    conv.turns = [];
  }
  conv.turns.push(newTurn);
}

async function handleReferencesUpdated() {
  if (!activeItem.value.data || !activeItem.value.type) return;

  const id = activeItem.value.data.id;
  const type = activeItem.value.type;
  const endpoint = type === 'conversation' ? 'conversation' : 'question-answer';

  activeItem.value.loading = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/${endpoint}/${id}/`);
    if (response.ok) {
      const updatedItem = await response.json();
      activeItem.value.data = updatedItem;
      if (updatedItem.references && updatedItem.references.length > 0) {
        const oldId = activeItem.value.linkingRef?.id;
        const newRef = updatedItem.references.find((r: any) => r.id === oldId) || updatedItem.references[0];
        activeItem.value.linkingRef = newRef;
      }
    }
  } catch (e) {
    console.error('Failed to refresh item after reference update', e);
  } finally {
    activeItem.value.loading = false;
  }
}

async function fetchSection() {
  loading.value = true;
  error.value = '';
  try {
    const sectionPromise = apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/?sec_info=essentials,findings,pm&cont_info=essentials,findings,emphasis,pm&path_coded=1&pageinfo=1`);
    const taskPromise = fetchActiveBackgroundTask();
    // Awaited: the singular->plural facet lookups below depend on it. Memoised in the store.
    const facetsPromise = facetsStore.fetchFacetQueries();
    // The admin portal reads render_method off the facet applications. Not fatal
    // to the section if it fails - the panels just lose their render-method badge.
    const facetAppsPromise = facetsStore.fetchFacetApplications().catch(() => []);

    const [res] = await Promise.all([sectionPromise, taskPromise, facetsPromise, facetAppsPromise]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
    openFindingIds.value = {};
    selectedOccurrence.value = null;
    // The expanded admin panel holds slices of the old payload.
    expandedInfoType.value = null;
    expandedInfoKey.value = null;
    expandedInfoData.value = null;

    // Start with every facet represented in this section switched on.
    activeFacetTypes.value = new Set(usedFacetTypes.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load section';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchSection);
watch(() => props.sectionPath, fetchSection);
</script>

<style scoped>
.section-study {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: 0.5rem 1rem;
}

.section-study__toolbar {
  position: sticky;
  top: -0.5rem;
  z-index: 100;
  background: var(--color-bg);
  padding: 0.25rem 0;
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
  align-items: center;

  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.section-study__toolbar sl-divider {
  height: 1.5rem;
  --spacing: 0.5rem;
}

.section-study__toolbar sl-icon-button {
  font-size: 1.1rem;
}

.section-admin-actions-portal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--sl-color-warning-200);
  border-radius: var(--sl-border-radius-medium);
  margin-bottom: 2rem;
}

.portal-section-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sl-color-warning-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.portal-group-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sl-color-neutral-500);
  text-transform: uppercase;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.portal-divider {
  height: 1px;
  background-color: var(--sl-color-neutral-200);
  margin: 0.25rem 0;
}

.portal-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0.5rem;
}

.portal-checkbox-group sl-checkbox::part(label) {
  font-size: 0.8rem;
}

.toolbar-infoleft {
  grid-area: infoleft;
}

.section-study__toolbar .tools-left {
  grid-area: summary;
  justify-self: start;
}

.section-study__toolbar .tools-mid {
  grid-area: content;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.section-study__toolbar .tools-right {
  grid-area: entities;
  display: flex;
  justify-content: space-between;
  justify-self: end;
  gap: 0.5rem;
}

.toolbar-inforight {
  grid-area: inforight;
}

.section-study__toolbar sl-dropdown sl-menu::part(base),
.section-study__toolbar sl-dropdown sl-menu-item::part(base) {
  font-size: 0.85rem;
}

.toolbar-menu-item--extraordinary::part(label) {
  font-style: italic;
}

.breadcrumb-link {
  color: var(--sl-color-neutral-600);
  text-decoration: none;
  font-size: 0.9rem;
}

.breadcrumb-link:hover {
  color: var(--sl-color-primary-600);
}

.nav-portal-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: 0.5rem;
}

.section-admin-info-portal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-jobs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.active-task {
  background: var(--sl-color-neutral-100);
  padding: 0.75rem;
  border-radius: var(--sl-border-radius-medium);
  font-size: 0.85rem;
}

.active-task__goal {
  font-weight: 700;
  text-transform: uppercase;
  color: var(--sl-color-primary-700);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.active-task__title {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.active-job {
  border-top: 1px solid var(--sl-color-neutral-300);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.active-job__phase {
  font-family: var(--sl-font-mono);
  font-size: 0.75rem;
  color: var(--sl-color-neutral-600);
  margin-bottom: 0.25rem;
}

.active-job__stats {
  font-size: 0.8rem;
  color: var(--sl-color-neutral-500);
}

.no-active-task {
  font-size: 0.85rem;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}

.section-insight-badges {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.insight-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.insight-group__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--sl-color-neutral-500);
}

.insight-group__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.facet-badge {
  font-family: var(--sl-font-sans);
}

.no-badges {
  color: var(--sl-color-neutral-300);
  font-size: 0.8rem;
}

.pm-manifest {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pm-log-details {
  margin-top: 0.5rem;
}

.pm-log-details::part(base) {
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
}

.pm-log-details::part(header) {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.pm-log-details::part(content) {
  padding: 0;
}

.pm-log {
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.8rem;
  background: var(--sl-color-neutral-50);
}

.pm-log-entry {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--sl-color-neutral-200);
}

.pm-log-entry:last-child {
  border-bottom: none;
}

.pm-log-entry--error {
  background-color: var(--sl-color-danger-50);
}

.pm-log-entry__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.pm-log-entry__time {
  color: var(--sl-color-neutral-500);
  font-size: 0.75rem;
}

.pm-log-entry__notes {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.pm-log-note {
  display: flex;
  gap: 0.5rem;
}

.pm-log-note__key {
  font-weight: 600;
  color: var(--sl-color-neutral-600);
  min-width: 60px;
}

.pm-log-note__val {
  color: var(--sl-color-neutral-800);
  word-break: break-all;
}

.pm-log-entry__errors {
  margin-top: 0.25rem;
  color: var(--sl-color-danger-600);
  font-weight: 500;
}

.pm-log-empty, .no-manifest {
  padding: 1rem;
  text-align: center;
  color: var(--sl-color-neutral-400);
  font-style: italic;
  font-size: 0.85rem;
}

.interactive-badge {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.interactive-badge:hover {
  transform: scale(1.1);
}

.expanded-info-container {
  margin: 0.5rem 0;
  overflow: hidden;
}

.occurrence-info-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 2000px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.segments-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.segment-details::part(base) {
  border: 0px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-neutral-50);
  overflow: hidden;
}

.segment-summary-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  text-align: left;
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.segment-range-badge {
  flex-shrink: 0;
}

.segment-caption {
  font-weight: 200;
  color: var(--sl-color-lime-800);
}

.segment-description {
  margin: 0;
  font-size: 0.90rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--sl-color-neutral-500);
}

.segment-keywords {
  font-size: 0.85rem;
  color: var(--sl-color-primary-600);
  opacity: 0.8;
}

.segment-content {
  padding: 0.25rem;
  background-color: var(--sl-color-neutral-0);
  border-top: 0 solid var(--sl-color-neutral-200);
}

.orphans-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--sl-color-neutral-200);
}

.orphans-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--sl-color-neutral-600);
}

.section-study__header {
  margin-bottom: 0.1rem;
  padding-bottom: 0.1rem;
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
}

.section-study__title {
  grid-area: content;
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #111827);
}

.section-pages {
  grid-area: inforight;
  align-self: end;
  text-align: right;
  font-size: 0.9rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 300;
  padding-bottom: 0.5rem;
}

.section-study__content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: initial;
  margin: 2rem auto;
  width: 100%;
}

.section-study__status {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted, #6b7280);
  font-size: 1.1rem;
}

.section-study__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}
</style>
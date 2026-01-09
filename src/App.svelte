<script lang="ts">
  import Viewport from './lib/components/Viewport.svelte'
  import Sidebar from './lib/components/Sidebar.svelte'
  import Timeline from './lib/components/Timeline.svelte'
  import ExportModal from './lib/components/ExportModal.svelte'
  import ImageControls from './lib/components/ImageControls.svelte'
  import { settings } from './lib/stores/settings'
  import { theme, toggleTheme } from './lib/stores/theme'

  let showExportModal = false
  let viewportComponent: { regenerateDepth: () => void } | undefined

  function openExportModal() {
    showExportModal = true
  }

  function closeExportModal() {
    showExportModal = false
  }

  function handleRegenerate() {
    viewportComponent?.regenerateDepth()
  }
</script>

<div class="app-container">
  <header class="header">
    <div class="header-left">
      <h1>MOTIONPIC MAGIC</h1>
    </div>

    <div class="header-center">
      <ImageControls
        imageUrl={$settings.colorMapUrl}
        onRegenerate={handleRegenerate}
      />
    </div>

    <div class="header-actions">
      <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
        {$theme === 'dark' ? '☀' : '🌙'}
      </button>
      <button disabled={!$settings.imageLoaded} onclick={openExportModal}>Export</button>
    </div>
  </header>

  <div class="main-content">
    <div class="viewport-area">
      <Viewport bind:this={viewportComponent} />
      <Timeline />
    </div>
    <Sidebar />
  </div>

  {#if showExportModal}
    <ExportModal onClose={closeExportModal} />
  {/if}
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-center {
    display: flex;
    justify-content: center;
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: flex-end;
  }

  .theme-toggle {
    padding: 0.5rem;
    min-width: auto;
    font-size: 1.25rem;
    line-height: 1;
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .theme-toggle:hover {
    background: var(--border);
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .viewport-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
</style>

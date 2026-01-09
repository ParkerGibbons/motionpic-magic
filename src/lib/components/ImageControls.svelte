<script lang="ts">
  import { settings } from '../stores/settings'
  import { getAvailableModels } from '../utils/depth'

  const models = getAvailableModels()

  export let onRegenerate: (() => void) | undefined = undefined
  export let imageUrl: string | null = null
</script>

{#if $settings.imageLoaded && imageUrl}
  <div class="image-controls">
    <div class="image-thumbnail">
      <img src={imageUrl} alt="Loaded image" />
    </div>

    <div class="depth-model-selector">
      <label for="depth-model">Depth Model:</label>
      <select
        id="depth-model"
        bind:value={$settings.depthModel}
        disabled={$settings.depthProcessing}
      >
        {#each models as model}
          <option value={model.id}>
            {model.name}
          </option>
        {/each}
      </select>

      <button
        class="regenerate-btn"
        onclick={onRegenerate}
        disabled={$settings.depthProcessing}
        title="Regenerate depth map with selected model"
      >
        {$settings.depthProcessing ? 'Processing...' : 'Regenerate'}
      </button>
    </div>

    {#if $settings.depthProcessing}
      <div class="processing-indicator">
        <div class="spinner"></div>
        <span>Processing depth map...</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .image-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    border: 1px solid var(--border);
  }

  .image-thumbnail {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--bg-primary);
    flex-shrink: 0;
  }

  .image-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .depth-model-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .depth-model-selector label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .depth-model-selector select {
    padding: 0.375rem 0.625rem;
    font-size: 0.875rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
  }

  .depth-model-selector select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .regenerate-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    min-width: auto;
    white-space: nowrap;
  }

  .processing-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

<script lang="ts">
  import Header from './Header.svelte';
  import { t } from '../i18n';

  export let imagePath: string;
  export let errorMessage: string | undefined = undefined;
  export let initialY: string = '50%';
  export let onSavePosition: (position: { y: string }) => void;
  export let height: string = '200px';
  export let onLayoutChange: (detail: { marginBottom: string }) => void;

  export let headerText: string | undefined = undefined;
  export let headerIcon: string | undefined = undefined;
  export let headerHAlign: 'left' | 'center' | 'right' = 'left';
  export let headerVAlign: 'top' | 'center' | 'bottom' | 'edge' = 'bottom';
  export let headerDecor: 'none' | 'shadow' | 'border' = 'shadow';
  export let headerTitleSize: string = '1.2em';
  export let headerIconSize: string = '1.5em';
  export let isDraggable: boolean = true;

  let isDragging = false;
  let startMouseY: number;
  let startImageY: number;
  let currentY: number;
  let bannerContainer: HTMLElement;

  function handleHeaderHeightChange(detail: { height: number; vAlign: string }) {
    const { height, vAlign } = detail;
    let marginBottom = '1rem'; // Margen por defecto
    if (vAlign === 'edge' || vAlign === 'bottom') {
      const overlap = vAlign === 'edge' ? height / 2 : 0;
      marginBottom = `${Math.max(0, overlap + 16)}px`;
    }
    onLayoutChange({ marginBottom });
  }

  $: {
    const normalizedY = String(initialY || '50%')
      .trim()
      .endsWith('%')
      ? String(initialY || '50%')
      : `${initialY || '50%'}`;
    currentY = parseFloat(normalizedY);
  }

  function handleMouseDown(event: MouseEvent) {
    if (!isDraggable) return;
    if (!bannerContainer) return;
    event.preventDefault();
    isDragging = true;
    startMouseY = event.clientY;
    startImageY = currentY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging || !bannerContainer) return;
    const deltaY = event.clientY - startMouseY;
    const deltaPercent = (deltaY / bannerContainer.clientHeight) * 100;
    const newY = startImageY - deltaPercent;
    currentY = Math.max(0, Math.min(100, newY));
  }
  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    const finalPosition = `${currentY.toFixed(1)}%`;
    onSavePosition({ y: finalPosition });
  }
</script>

{#if imagePath}
  <div
    class="banner-container is-draggable"
    class:is-dragging={isDragging}
    bind:this={bannerContainer}
    on:mousedown={handleMouseDown}
    role="button"
    tabindex="0"
    style:--banner-height={height}
  >
    <img src={imagePath} alt="Banner" class="banner-image" style:--object-position-y="{currentY}%" />

    {#if headerText || headerIcon}
      <Header
        text={headerText}
        icon={headerIcon}
        hAlign={headerHAlign}
        vAlign={headerVAlign}
        decor={headerDecor}
        titleSize={headerTitleSize}
        iconSize={headerIconSize}
        onHeightChange={handleHeaderHeightChange}
      />
    {/if}
  </div>
{:else}
  <div class="banner-error-container" style:--banner-height={height}>
    <div class="banner-error-icon">❌</div>
    <div class="banner-error-message">{errorMessage || t('ERROR_UNKNOWN')}</div>
  </div>
{/if}

<style>
  .banner-container {
    height: var(--banner-height, 200px);
    width: 100%;
    margin-bottom: 0;
    overflow: visible;
    border-radius: 0px;
    position: relative;
  }
  .banner-error-container {
    height: var(--banner-height, 150px);
    width: 100%;
    margin-bottom: 1rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;

    border: 2px dashed var(--text-muted);
    border-radius: 8px;
    padding: 16px;
    color: var(--text-muted);
    text-align: center;
  }
  .banner-error-icon {
    font-size: 1.5em;
  }
  .banner-error-message {
    font-family: var(--font-monospace);
    font-size: var(--font-ui-smaller);
    word-break: break-all;
  }
  .banner-image {
    object-position: 50% var(--object-position-y, 50%);
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    cursor: default;
  }
  .is-draggable {
    cursor: grab;
  }
  .is-draggable .banner-image {
    cursor: grab;
  }
  .is-draggable.is-dragging {
    cursor: grabbing;
  }
  .is-draggable.is-dragging .banner-image {
    cursor: grabbing;
  }
</style>

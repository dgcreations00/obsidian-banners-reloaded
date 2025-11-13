<script lang="ts">
  import { setIcon } from 'obsidian';
  import { onMount } from 'svelte';

  export let text: string | undefined = undefined;
  export let icon: string | undefined = undefined;
  export let hAlign: 'left' | 'center' | 'right' = 'left';
  export let vAlign: 'top' | 'center' | 'bottom' | 'edge' = 'bottom';
  export let decor: 'none' | 'shadow' | 'border' = 'shadow';
  export let titleSize: string = '1.2em';
  export let iconSize: string = '1.5em';
  export let onHeightChange: (detail: { height: number; vAlign: string }) => void;

  let iconEl: HTMLElement;
  let clientHeight = 0;
  const isObsidianIcon = icon && icon.startsWith('lucide-');

  onMount(() => {
    if (isObsidianIcon && iconEl) {
      setIcon(iconEl, icon);
    }
  });

  $: if (clientHeight > 0 || vAlign) {
    onHeightChange({ height: clientHeight, vAlign });
  }
</script>

<div
  class="banner-header-wrapper"
  class:h-left={hAlign === 'left'}
  class:h-center={hAlign === 'center'}
  class:h-right={hAlign === 'right'}
  class:v-top={vAlign === 'top'}
  class:v-center={vAlign === 'center'}
  class:v-bottom={vAlign === 'bottom'}
  class:v-edge={vAlign === 'edge'}
  bind:clientHeight
>
  <div class="banner-header-content" class:decor-shadow={decor === 'shadow'} class:decor-border={decor === 'border'}>
    {#if icon}
      <div class="banner-icon" style:--icon-size={iconSize} bind:this={iconEl}>
        {#if !isObsidianIcon}
          {icon}
        {/if}
      </div>
    {/if}
    {#if text}
      <h1 class="banner-header-title" style:font-size={titleSize}>{text}</h1>
    {/if}
  </div>
</div>

<style>
  .banner-header-wrapper {
    position: absolute;
    display: flex;
    max-width: 90%;
    --transform-x: 0;
    --transform-y: 0;
    transform: translate(var(--transform-x), var(--transform-y));
  }
  .v-top {
    top: 16px;
  }
  .v-center {
    top: 50%;
    --transform-y: -50%;
  }
  .v-bottom {
    bottom: 16px;
  }
  .v-edge {
    bottom: 0;
    --transform-y: 50%;
  }
  .h-left {
    left: 30px;
  }
  .h-center {
    left: 50%;
    --transform-x: -50%;
  }
  .h-right {
    right: 30px;
    justify-content: flex-end;
  }
  .banner-header-content {
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: white;
  }
  .decor-shadow {
    filter: drop-shadow(0 1px 3px rgb(0 0 0 / 0.6));
  }
  .decor-border {
    -webkit-text-stroke: 1px var(--background-primary);
    paint-order: stroke fill;
  }
  .banner-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-size: var(--icon-size, 1.5em);
  }
  .banner-icon :global(svg) {
    width: calc(var(--icon-size, 1.5em) * 0.3);
    height: calc(var(--icon-size, 1.5em) * 0.3);
  }
  .banner-header-title {
    font-weight: 700;
    margin: 0;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }
</style>

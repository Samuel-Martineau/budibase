<script>
  import { helpers } from "@budibase/shared-core"
  import { DetailSummary, notifications } from "@budibase/bbui"
  import { store } from "builderStore"
  import PropertyControl from "components/design/settings/controls/PropertyControl.svelte"
  import ResetFieldsButton from "components/design/settings/controls/ResetFieldsButton.svelte"
  import EjectBlockButton from "components/design/settings/controls/EjectBlockButton.svelte"
  import { getComponentForSetting } from "components/design/settings/componentSettings"
  import InfoDisplay from "./InfoDisplay.svelte"
  import analytics, { Events } from "analytics"

  export let componentDefinition
  export let componentInstance
  export let bindings
  export let componentBindings
  export let isScreen = false
  export let onUpdateSetting
  export let showSectionTitle = true
  export let tag

  $: sections = getSections(
    componentInstance,
    componentDefinition,
    isScreen,
    tag
  )

  const getSections = (instance, definition, isScreen, tag) => {
    const settings = definition?.settings ?? []
    const generalSettings = settings.filter(
      setting => !setting.section && setting.tag === tag
    )
    const customSections = settings.filter(
      setting => setting.section && setting.tag === tag
    )
    let sections = [
      ...(generalSettings?.length
        ? [
            {
              name: "General",
              settings: generalSettings,
            },
          ]
        : []),
      ...(customSections || []),
    ]

    // Filter out settings which shouldn't be rendered
    sections.forEach(section => {
      section.visible = shouldDisplay(instance, section)
      if (!section.visible) {
        return
      }
      section.settings.forEach(setting => {
        setting.visible = canRenderControl(instance, setting, isScreen)
      })
      section.visible =
        section.name === "General" ||
        section.settings.some(setting => setting.visible)
    })

    return sections
  }

  const updateSetting = async (setting, value) => {
    try {
      if (typeof onUpdateSetting === "function") {
        await onUpdateSetting(setting, value)
      } else {
        await store.actions.components.updateSetting(setting.key, value)
      }
      // Send event if required
      if (setting.sendEvents) {
        analytics.captureEvent(Events.COMPONENT_UPDATED, {
          name: componentInstance._component,
          setting: setting.key,
          value,
        })
      }
    } catch (error) {
      notifications.error("Error updating component prop")
    }
  }

  const shouldDisplay = (instance, setting) => {
    let dependsOn = setting.dependsOn
    if (dependsOn && !Array.isArray(dependsOn)) {
      dependsOn = [dependsOn]
    }
    if (!dependsOn?.length) {
      return true
    }

    // Ensure all conditions are met
    return dependsOn.every(condition => {
      let dependantSetting = condition
      let dependantValues = null
      let invert = !!condition.invert
      if (typeof condition === "object") {
        dependantSetting = condition.setting
        dependantValues = condition.value
      }
      if (!dependantSetting) {
        return false
      }

      // Ensure values is an array
      if (!Array.isArray(dependantValues)) {
        dependantValues = [dependantValues]
      }

      // If inverting, we want to ensure that we don't have any matches.
      // If not inverting, we want to ensure that we do have any matches.
      const currentVal = helpers.deepGet(instance, dependantSetting)
      const anyMatches = dependantValues.some(dependantVal => {
        if (dependantVal == null) {
          return currentVal != null && currentVal !== false && currentVal !== ""
        }
        return dependantVal === currentVal
      })
      return anyMatches !== invert
    })
  }

  const canRenderControl = (instance, setting, isScreen) => {
    // Prevent rendering on click setting for screens
    if (setting?.type === "event" && isScreen) {
      return false
    }
    const control = getComponentForSetting(setting)
    if (!control) {
      return false
    }

    return shouldDisplay(instance, setting)
  }
</script>

{#each sections as section, idx (section.name)}
  {#if section.visible}
    <DetailSummary
      name={showSectionTitle ? section.name : ""}
      show={section.collapsed !== true}
    >
      {#if section.info}
        <div class="section-info">
          <InfoDisplay body={section.info} />
        </div>
      {:else if idx === 0 && section.name === "General" && componentDefinition?.info && !tag}
        <InfoDisplay
          title={componentDefinition.name}
          body={componentDefinition.info}
        />
      {/if}
      <div class="settings">
        {#each section.settings as setting (setting.key)}
          {#if setting.visible}
            <PropertyControl
              type={setting.type}
              control={getComponentForSetting(setting)}
              label={setting.label}
              labelHidden={setting.labelHidden}
              key={setting.key}
              value={componentInstance[setting.key]}
              defaultValue={setting.defaultValue}
              nested={setting.nested}
              onChange={val => updateSetting(setting, val)}
              highlighted={$store.highlightedSettingKey === setting.key}
              propertyFocus={$store.propertyFocus === setting.key}
              info={setting.info}
              props={{
                // Generic settings
                placeholder: setting.placeholder || null,

                // Select settings
                options: setting.options || [],

                // Number fields
                min: setting.min ?? null,
                max: setting.max ?? null,
              }}
              {bindings}
              {componentBindings}
              {componentInstance}
              {componentDefinition}
              on:drawerShow
              on:drawerHide
            />
          {/if}
        {/each}
        {#if idx === 0 && componentDefinition?.component?.endsWith("/fieldgroup")}
          <ResetFieldsButton {componentInstance} />
        {/if}
      </div>
    </DetailSummary>
  {/if}
{/each}
{#if componentDefinition?.block && !tag}
  <DetailSummary name="Eject" collapsible={false}>
    <EjectBlockButton />
  </DetailSummary>
{/if}

<style>
  .settings {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: 8px;
  }
</style>

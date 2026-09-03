import { ascendExperiencePack } from './ascend/AscendExperiencePack'

export const activeExperiencePack = ascendExperiencePack

export function getExperiencePack(id: string) {
  return id === activeExperiencePack.id ? activeExperiencePack : undefined
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createGraphAnnotation,
  type GraphAnnotation,
  type GraphAnnotationInput,
  type GraphAnnotationStatus,
} from '@/core/annotations/graphAnnotations';

interface AnnotationState {
  annotations: GraphAnnotation[];
}

interface AnnotationActions {
  addAnnotation: (input: GraphAnnotationInput) => GraphAnnotation;
  importAnnotations: (annotations: GraphAnnotation[]) => void;
  setAnnotationStatus: (id: string, status: GraphAnnotationStatus) => void;
  removeAnnotation: (id: string) => void;
  clearGraphAnnotations: (graphId: string) => void;
}

export const useAnnotationStore = create<AnnotationState & AnnotationActions>()(
  persist(
    (set) => ({
      annotations: [],
      addAnnotation: (input) => {
        const annotation = createGraphAnnotation(input);
        set((state) => ({
          annotations: upsertAnnotations(state.annotations, [annotation]),
        }));
        return annotation;
      },
      importAnnotations: (annotations) =>
        set((state) => ({
          annotations: upsertAnnotations(state.annotations, annotations),
        })),
      setAnnotationStatus: (id, status) =>
        set((state) => ({
          annotations: state.annotations.map((annotation) =>
            annotation.id === id
              ? { ...annotation, status, updatedAt: Date.now() }
              : annotation
          ),
        })),
      removeAnnotation: (id) =>
        set((state) => ({
          annotations: state.annotations.filter((annotation) => annotation.id !== id),
        })),
      clearGraphAnnotations: (graphId) =>
        set((state) => ({
          annotations: state.annotations.filter((annotation) => annotation.graphId !== graphId),
        })),
    }),
    {
      name: 'phosphene-annotations',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ annotations: state.annotations }),
    }
  )
);

function upsertAnnotations(
  current: GraphAnnotation[],
  incoming: GraphAnnotation[]
): GraphAnnotation[] {
  const byId = new Map(current.map((annotation) => [annotation.id, annotation]));
  for (const annotation of incoming) byId.set(annotation.id, annotation);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

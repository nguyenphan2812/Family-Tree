"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Node,
  Edge,
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import { usePeople } from "@/src/features/person/hooks/usePeople";
import { usePersonMutations } from "@/src/features/person/hooks/usePersonMutations";
import { useMarriages } from "@/src/features/marriage/hooks/useMarriages";
import { useMarriageMutations } from "@/src/features/marriage/hooks/useMarriageMutations";
import { useIsEditor } from "@/src/features/auth/hooks/useIsEditor";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { ManageEditorsModal } from "@/src/features/auth/components/ManageEditorsModal";
import { buildGraph } from "../utils/buildGraph";
import { PersonNode } from "../context/PersonNode";
import { UnionNode } from "./UnionNode";
import { TreeContext } from "../context/TreeContext";
import { PersonFormModal, PersonFormData } from "./PersonFormModal";
import { PersonDetailModal } from "./PersonDetailModal";
import { AddParentModal } from "./AddParentModal";
import { AddSpouseModal } from "./AddSpouseModal";
import { SelectSpouseForChildModal } from "./SelectSpouseForChildModal";
import { TreeSearchBar } from "./TreeSearchBar";
import { layoutGraph, PERSON_NODE_WIDTH, PERSON_NODE_HEIGHT } from "../utils/layoutGraph";
import { Person, Marriage } from "@/src/types/family";
import { writeBatch } from "firebase/firestore";
import { marriageDoc, personDoc } from "@/src/lib/queries";
import { db } from "@/src/lib/firebase";
import { FamilyEdge } from "./FamilyEdge";

const nodeTypes = { person: PersonNode, union: UnionNode };
const edgeTypes = { smoothstep: FamilyEdge, family: FamilyEdge };

function TreeCanvasInner() {
  const { people, loading: peopleLoading, error: peopleError } = usePeople();
  const { marriages, error: marriagesError } = useMarriages();
  const { addPerson, updatePerson, deletePerson } = usePersonMutations();
  const {
    createMarriage,
    addChildToMarriage,
    addSpouseToMarriage,
    removePersonFromAllMarriages,
  } = useMarriageMutations();
  const { isEditor, user } = useIsEditor();
  const { signIn, logOut } = useAuth();
  const { fitView, setCenter } = useReactFlow();
  const initialFitDoneRef = useRef(false);

  // State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [collapsedMarriageIds, setCollapsedMarriageIds] = useState<Set<string>>(new Set());
  const [hoveredUnionId, setHoveredUnionId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  // Modal states
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null);
  const [addingParentForChildId, setAddingParentForChildId] = useState<string | null>(null);
  const [addingSpouseForPersonId, setAddingSpouseForPersonId] = useState<string | null>(null);
  const [addingSpouseDirection, setAddingSpouseDirection] = useState<"left" | "right">("right");
  const [selectingSpouseForChildParentId, setSelectingSpouseForChildParentId] = useState<string | null>(null);
  const [addingChildTargetMarriageId, setAddingChildTargetMarriageId] = useState<string | null>(null);
  const [isAddingRootTree, setIsAddingRootTree] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showManageEditors, setShowManageEditors] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Layout calculation
  const { graphNodes, graphEdges, personGenerations } = useMemo(() => {
    const isCollapsed = collapsedMarriageIds.size > 0;
    const { nodes: rawNodes, edges: rawEdges, personGenerations } = buildGraph(
      people,
      marriages,
      {
        collapsedMarriageIds,
        isCollapsed,
      }
    );
    return { graphNodes: rawNodes, graphEdges: rawEdges, personGenerations };
  }, [people, marriages, collapsedMarriageIds]);

  useEffect(() => {
    let isCancelled = false;
    const isCollapsed = collapsedMarriageIds.size > 0;
    layoutGraph(graphNodes, graphEdges, { isCollapsed }).then(
      ({ nodes: positionedNodes, edges: positionedEdges }) => {
        if (!isCancelled) {
          setNodes(positionedNodes);
          setEdges(positionedEdges);
        }
      }
    );
    return () => {
      isCancelled = true;
    };
  }, [graphNodes, graphEdges, collapsedMarriageIds]);

  // Lookup maps for fast ancestor & descendant traversal (memoized per marriages)
  const { parentMarriageByChildId, marriagesBySpouseId } = useMemo(() => {
    const parentMap = new Map<string, Marriage>();
    const spouseMap = new Map<string, Marriage[]>();
    for (const m of marriages) {
      for (const cid of m.childrenIds) {
        parentMap.set(cid, m);
      }
      for (const sid of m.spouseIds) {
        if (!spouseMap.has(sid)) {
          spouseMap.set(sid, []);
        }
        spouseMap.get(sid)!.push(m);
      }
    }
    return { parentMarriageByChildId: parentMap, marriagesBySpouseId: spouseMap };
  }, [marriages]);

  // Compute active nodes & edges when hovering on a Union or Person (full recursive bloodline traversal)
  const { activeNodeIds, activeEdgeIds } = useMemo(() => {
    if (!hoveredUnionId && !hoveredPersonId) {
      return { activeNodeIds: null, activeEdgeIds: null };
    }
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    // Recursive ancestor traversal (parents, grandparents, great-grandparents, ...)
    const visitedAncestors = new Set<string>();
    const addAncestors = (personId: string) => {
      if (visitedAncestors.has(personId)) return;
      visitedAncestors.add(personId);

      const parentM = parentMarriageByChildId.get(personId);
      if (!parentM) return;
      const unionId = `union-${parentM.id}`;
      nodeIds.add(unionId);
      for (const sid of parentM.spouseIds) {
        nodeIds.add(sid);
        addAncestors(sid);
      }
    };

    // Recursive descendant traversal (children, grandchildren, great-grandchildren, ...)
    const visitedDescendants = new Set<string>();
    const addDescendants = (personId: string) => {
      if (visitedDescendants.has(personId)) return;
      visitedDescendants.add(personId);

      const ownMarriages = marriagesBySpouseId.get(personId) ?? [];
      for (const m of ownMarriages) {
        const unionId = `union-${m.id}`;
        nodeIds.add(unionId);
        for (const sid of m.spouseIds) {
          nodeIds.add(sid);
        }
        for (const cid of m.childrenIds) {
          nodeIds.add(cid);
          addDescendants(cid);
        }
      }
    };

    if (hoveredUnionId) {
      const mId = hoveredUnionId.startsWith("union-")
        ? hoveredUnionId.replace("union-", "")
        : hoveredUnionId;
      const marriage = marriages.find((m) => m.id === mId);
      if (marriage) {
        nodeIds.add(`union-${marriage.id}`);
        for (const sid of marriage.spouseIds) {
          nodeIds.add(sid);
          addAncestors(sid);
        }
        for (const cid of marriage.childrenIds) {
          nodeIds.add(cid);
          addDescendants(cid);
        }
      }
    } else if (hoveredPersonId) {
      nodeIds.add(hoveredPersonId);
      // Include direct siblings for immediate family context
      const parentM = parentMarriageByChildId.get(hoveredPersonId);
      if (parentM) {
        nodeIds.add(`union-${parentM.id}`);
        for (const sid of parentM.spouseIds) {
          nodeIds.add(sid);
        }
        for (const cid of parentM.childrenIds) {
          nodeIds.add(cid);
        }
      }
      // Trace all ancestors up to the roots
      addAncestors(hoveredPersonId);
      // Trace all descendants down to the leaves
      addDescendants(hoveredPersonId);
    }

    // Collect all edges connecting the active bloodline nodes
    for (const e of edges) {
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        // e-direct- edges are multi-spouse jump edges across intervening nodes.
        // Only skip jump edges when hovering directly on the shared spouse (e.g. Phan Xuân),
        // to prevent multiple conflicting marriage colors from drawing over each other.
        // When hovering on any other node (a union, an outer spouse, or ANY descendant child in Gen 2+),
        // the direct edge connects the bloodline back to the shared parent in Gen 1!
        if (e.id.startsWith("e-direct-")) {
          const edgeData = e.data as { marriageId?: string; sharedId?: string; outerId?: string } | undefined;
          if (hoveredPersonId && edgeData?.sharedId && hoveredPersonId === edgeData.sharedId) {
            continue;
          }
        }
        edgeIds.add(e.id);
      }
    }

    return { activeNodeIds: nodeIds, activeEdgeIds: edgeIds };
  }, [hoveredUnionId, hoveredPersonId, parentMarriageByChildId, marriagesBySpouseId, marriages, edges]);

  // Styled display nodes (dim non-active nodes to 25% when hovering; all nodes stay strictly above edges)
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      const isDimmed = activeNodeIds ? !activeNodeIds.has(n.id) : false;
      const isActive = activeNodeIds ? activeNodeIds.has(n.id) : false;
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isDimmed ? 0.25 : 1,
          filter: isDimmed ? "grayscale(40%)" : "none",
          transition: "opacity 0.2s ease, filter 0.2s ease",
          zIndex: isDimmed ? 25 : (isActive ? 50 : 30),
        },
      };
    });
  }, [nodes, activeNodeIds]);

  // Styled display edges (edges stay at zIndex 2/0 behind nodes; highlighted edges get zIndex 20)
  const displayEdges = useMemo(() => {
    return edges.map((e) => {
      const isDirect = e.id.startsWith("e-direct-");
      const isHighlighted = activeEdgeIds ? activeEdgeIds.has(e.id) : false;
      const isCollapsedChild = Boolean(e.data?.isCollapsedChildEdge);

      if (isDirect) {
        return {
          ...e,
          zIndex: isHighlighted ? 20 : 0,
          style: {
            ...e.style,
            opacity: isHighlighted ? 1 : 0,
            strokeWidth: isHighlighted ? 3 : 0,
            pointerEvents: isHighlighted ? ("auto" as const) : ("none" as const),
            transition: "opacity 0.2s ease, stroke-width 0.2s ease",
            zIndex: isHighlighted ? 20 : 0,
          },
        };
      }

      // If this child edge belongs to a collapsed marriage:
      // In collapsed mode: completely hidden (opacity: 0, strokeWidth: 0) unless hovered/highlighted!
      if (isCollapsedChild) {
        return {
          ...e,
          zIndex: isHighlighted ? 20 : 0,
          style: {
            ...e.style,
            opacity: isHighlighted ? 1 : 0,
            strokeWidth: isHighlighted ? 2.5 : 0,
            pointerEvents: isHighlighted ? ("auto" as const) : ("none" as const),
            transition: "opacity 0.2s ease, stroke-width 0.2s ease",
            zIndex: isHighlighted ? 20 : 0,
          },
        };
      }

      if (!activeEdgeIds) {
        return {
          ...e,
          zIndex: 2,
        };
      }

      return {
        ...e,
        zIndex: isHighlighted ? 20 : 1,
        style: {
          ...e.style,
          opacity: isHighlighted ? 1 : 0.12,
          strokeWidth: isHighlighted ? 3 : 1.5,
          transition: "opacity 0.2s ease, stroke-width 0.2s ease",
          zIndex: isHighlighted ? 20 : 1,
        },
      };
    });
  }, [edges, activeEdgeIds]);

  // Initial fit view on first load
  useEffect(() => {
    if (nodes.length > 0 && !initialFitDoneRef.current && !selectedPersonId) {
      initialFitDoneRef.current = true;
      const timeout = setTimeout(() => fitView({ padding: 0.35, duration: 400 }), 150);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length, selectedPersonId, fitView]);

  // Focus & glide to selected person
  const handleSelectPerson = useCallback(
    (personId: string) => {
      setSelectedPersonId(personId);
      const targetNode = nodes.find((n) => n.id === personId);
      if (targetNode) {
        setCenter(
          targetNode.position.x + PERSON_NODE_WIDTH / 2,
          targetNode.position.y + PERSON_NODE_HEIGHT / 2,
          { zoom: 1.1, duration: 600 }
        );
      }
    },
    [nodes, setCenter]
  );

  // Toggle collapsing of a marriage's descendant branch
  const handleToggleCollapseMarriage = useCallback((marriageId: string) => {
    setCollapsedMarriageIds((prev) => {
      const next = new Set(prev);
      if (next.has(marriageId)) {
        next.delete(marriageId);
      } else {
        next.add(marriageId);
      }
      return next;
    });
  }, []);

  // Collapse / Expand all branches
  const handleCollapseAll = useCallback(() => {
    const allWithChildren = marriages
      .filter((m) => m.childrenIds.length > 0)
      .map((m) => m.id);
    setCollapsedMarriageIds(new Set(allWithChildren));
  }, [marriages]);

  const handleExpandAll = useCallback(() => {
    setCollapsedMarriageIds(new Set());
  }, []);

  // 1. Upward Expansion: Thêm Cha / Mẹ
  const handleOpenAddParent = useCallback((childPersonId: string) => {
    setAddingParentForChildId(childPersonId);
  }, []);

  const handleSaveParent = useCallback(
    async (data: {
      fatherData?: PersonFormData;
      motherData?: PersonFormData;
      existingMarriageId?: string;
    }) => {
      if (!addingParentForChildId) return;

      let fatherId: string | undefined = undefined;
      let motherId: string | undefined = undefined;

      if (data.fatherData) {
        fatherId = await addPerson({ ...data.fatherData });
      }
      if (data.motherData) {
        motherId = await addPerson({ ...data.motherData });
      }

      if (data.existingMarriageId) {
        // Add missing spouse to existing marriage
        const missingSpouseId = fatherId || motherId;
        if (missingSpouseId) {
          await addSpouseToMarriage(data.existingMarriageId, missingSpouseId);
        }
      } else {
        // Create new marriage of parents with this child
        const spouseIds = [fatherId, motherId].filter(Boolean) as string[];
        await createMarriage({
          spouseIds,
          order: 1,
          childrenIds: [addingParentForChildId],
          isPlaceholder: spouseIds.length < 2,
        });
      }

      setAddingParentForChildId(null);
    },
    [addingParentForChildId, addPerson, addSpouseToMarriage, createMarriage]
  );

  // 2. Sideways Expansion: Thêm Phối ngẫu (Vợ / Chồng)
  const handleOpenAddSpouse = useCallback((personId: string, direction: "left" | "right" = "right") => {
    setAddingSpouseForPersonId(personId);
    setAddingSpouseDirection(direction);
  }, []);

  const handleSaveSpouse = useCallback(
    async (data: {
      spouseData: PersonFormData;
      order: number;
      orderLabel: string;
    }) => {
      if (!addingSpouseForPersonId) return;

      const newSpouseId = await addPerson({
        ...data.spouseData,
        spouseLabel: data.orderLabel,
      });

      await createMarriage({
        spouseIds: [addingSpouseForPersonId, newSpouseId],
        order: data.order,
        orderLabel: data.orderLabel,
        direction: addingSpouseDirection,
      });

      setAddingSpouseForPersonId(null);
    },
    [addingSpouseForPersonId, addingSpouseDirection, addPerson, createMarriage]
  );

  // 3. Downward Expansion: Thêm Con
  const handleOpenAddChildToMarriage = useCallback((marriageId: string) => {
    setAddingChildTargetMarriageId(marriageId);
  }, []);

  const handleOpenAddChildToPerson = useCallback(
    (parentPersonId: string) => {
      const personMarriages = marriages
        .filter((m) => m.spouseIds.includes(parentPersonId))
        .sort((a, b) => a.order - b.order);

      if (personMarriages.length === 0) {
        // Person has no marriages yet: create a placeholder marriage or prompt
        createMarriage({
          spouseIds: [parentPersonId],
          order: 1,
          isPlaceholder: true,
        }).then((newMId: string) => {
          setAddingChildTargetMarriageId(newMId);
        });
      } else if (personMarriages.length === 1) {
        // Exactly 1 marriage: proceed directly to add child
        setAddingChildTargetMarriageId(personMarriages[0].id);
      } else {
        // 2+ marriages: prompt user to pick WHICH spouse this child belongs to!
        setSelectingSpouseForChildParentId(parentPersonId);
      }
    },
    [marriages, createMarriage]
  );

  const handleSaveChild = useCallback(
    async (data: PersonFormData) => {
      if (!addingChildTargetMarriageId) return;

      const targetMarriage = marriages.find((m) => m.id === addingChildTargetMarriageId);
      const childCount = targetMarriage?.childrenIds.length ?? 0;
      const birthOrder = data.birthOrder ?? childCount + 1;

      const newChildId = await addPerson({
        ...data,
        birthOrder,
      });

      await addChildToMarriage(addingChildTargetMarriageId, newChildId);
      setAddingChildTargetMarriageId(null);
    },
    [addingChildTargetMarriageId, marriages, addPerson, addChildToMarriage]
  );

  // 4. Edit / Delete Person
  const editingPerson = useMemo(() => {
    if (!editingPersonId) return undefined;
    const fromPeople = people.find((p) => p.id === editingPersonId);
    if (fromPeople) return fromPeople;
    const node = graphNodes.find((n) => n.id === editingPersonId);
    return node?.data?.person as Person | undefined;
  }, [editingPersonId, people, graphNodes]);

  const viewingPerson = useMemo(() => {
    if (!viewingPersonId) return undefined;
    const fromPeople = people.find((p) => p.id === viewingPersonId);
    if (fromPeople) return fromPeople;
    const node = graphNodes.find((n) => n.id === viewingPersonId);
    return node?.data?.person as Person | undefined;
  }, [viewingPersonId, people, graphNodes]);

  const viewingPersonGeneration = viewingPersonId
    ? personGenerations.get(viewingPersonId)
    : undefined;

  const handleEditSave = useCallback(
    async (data: PersonFormData) => {
      if (!editingPersonId) return;
      if (editingPersonId.startsWith("placeholder-spouse-")) {
        const marriageId = editingPersonId.replace("placeholder-spouse-", "");
        const newPersonId = await addPerson({
          ...data,
          spouseLabel: data.spouseLabel || editingPerson?.spouseLabel,
        });
        await addSpouseToMarriage(marriageId, newPersonId);
      } else {
        await updatePerson(editingPersonId, data);
      }
      setEditingPersonId(null);
    },
    [editingPersonId, editingPerson, addPerson, addSpouseToMarriage, updatePerson]
  );

  const handleEditDelete = useCallback(async () => {
    if (!editingPersonId) return;
    await removePersonFromAllMarriages(editingPersonId, marriages);
    await deletePerson(editingPersonId);
    setEditingPersonId(null);
  }, [editingPersonId, marriages, removePersonFromAllMarriages, deletePerson]);

  // Root Tree Add
  const handleAddTree = useCallback(
    async (data: PersonFormData) => {
      await addPerson({ ...data });
      setIsAddingRootTree(false);
    },
    [addPerson]
  );

  // Reset / Clear all data for re-testing (Editor only, atomic batch)
  const handleResetAllData = useCallback(async () => {
    if (!isEditor) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      for (const p of people) {
        batch.delete(personDoc(p.id));
      }
      for (const m of marriages) {
        batch.delete(marriageDoc(m.id));
      }
      await batch.commit();
      setSelectedPersonId(null);
      setShowConfirmReset(false);
    } catch (err) {
      console.error("Failed to reset tree data:", err);
    } finally {
      setIsResetting(false);
    }
  }, [isEditor, people, marriages]);

  const childPersonForAddParent = people.find((p) => p.id === addingParentForChildId);
  const parentForAddSpouse = people.find((p) => p.id === addingSpouseForPersonId);
  const parentForSelectSpouse = people.find((p) => p.id === selectingSpouseForChildParentId);

  // Existing parent marriage for AddParentModal if any
  const existingParentMarriage = useMemo(() => {
    if (!addingParentForChildId) return undefined;
    return marriages.find((m) => m.childrenIds.includes(addingParentForChildId));
  }, [addingParentForChildId, marriages]);

  // Contextual info for adding child modal
  const targetMarriageForAddChild = useMemo(() => {
    if (!addingChildTargetMarriageId) return null;
    return marriages.find((m) => m.id === addingChildTargetMarriageId) ?? null;
  }, [addingChildTargetMarriageId, marriages]);

  const childTargetParentsSummary = useMemo(() => {
    if (!targetMarriageForAddChild) return "";
    const parentPersons = targetMarriageForAddChild.spouseIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));
    if (parentPersons.length === 0) return "";
    return `Con của: ${parentPersons.map((p) => `${p.firstName} ${p.lastName}`).join(" & ")}`;
  }, [targetMarriageForAddChild, people]);

  const childTargetDefaultLastName = useMemo(() => {
    if (!targetMarriageForAddChild) return "";
    const parentPersons = targetMarriageForAddChild.spouseIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));
    const father = parentPersons.find((p) => p.gender === "male");
    return father?.lastName || parentPersons[0]?.lastName || "";
  }, [targetMarriageForAddChild, people]);

  const childTargetDefaultOrder = useMemo(() => {
    if (!targetMarriageForAddChild) return 1;
    return targetMarriageForAddChild.childrenIds.length + 1;
  }, [targetMarriageForAddChild]);

  // Max generation count
  const maxGeneration = useMemo(() => {
    let max = 1;
    for (const gen of personGenerations.values()) {
      if (gen > max) max = gen;
    }
    return max;
  }, [personGenerations]);

  if (peopleError || marriagesError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm bg-slate-900 border border-red-800/80 p-6 rounded-2xl shadow-xl">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-base font-semibold text-red-300">Không thể tải dữ liệu gia phả</h2>
          <p className="text-xs text-slate-400">
            {peopleError?.message || marriagesError?.message || "Đã xảy ra sự cố khi kết nối dữ liệu. Vui lòng kiểm tra kết nối mạng."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 mt-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  if (peopleLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải dữ liệu gia phả...</span>
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 p-4">
        {!user ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
              🌳
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Bắt đầu Cây Gia Phả</h2>
              <p className="text-xs text-slate-400 mt-1">
                Cây gia phả hiện đang trống. Hãy đăng nhập tài khoản Editor để tạo người Thủy Tổ (Cụ Tổ) đầu tiên.
              </p>
            </div>
            <button
              onClick={() => signIn()}
              className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg cursor-pointer transition flex items-center gap-2"
            >
              🔑 Đăng nhập Google để bắt đầu
            </button>
          </div>
        ) : isEditor ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
              🌳
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Bắt đầu Cây Gia Phả</h2>
              <p className="text-xs text-slate-400 mt-1">
                Đăng nhập: <span className="text-emerald-400 font-medium">{user.email}</span> (Quyền Editor)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingRootTree(true)}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg cursor-pointer transition"
              >
                + Tạo Cụ Tổ (Bắt đầu cây)
              </button>
              <button
                onClick={() => logOut()}
                className="px-3 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs cursor-pointer transition"
              >
                Đăng xuất
              </button>
            </div>
            {isAddingRootTree && (
              <PersonFormModal
                title="Bắt đầu Cây Gia Phả (Thủy Tổ)"
                subtitle="Tạo người đứng đầu cây gia phả"
                submitLabel="Tạo Cụ Tổ"
                onSubmit={handleAddTree}
                onCancel={() => setIsAddingRootTree(false)}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <p className="text-slate-300 text-sm">
              Bạn đang đăng nhập là <strong className="text-white">{user.email}</strong>, nhưng tài khoản này chưa có trong danh sách Editor.
            </p>
            <button
              onClick={() => logOut()}
              className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs cursor-pointer transition"
            >
              Đăng xuất và đăng nhập tài khoản khác
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <TreeContext.Provider
      value={{
        isEditor,
        onEditPerson: setEditingPersonId,
        onViewPerson: setViewingPersonId,
        onAddParent: handleOpenAddParent,
        onAddSpouse: handleOpenAddSpouse,
        onAddChildToPerson: handleOpenAddChildToPerson,
        onAddChildToMarriage: handleOpenAddChildToMarriage,
        onToggleCollapseMarriage: handleToggleCollapseMarriage,
        onSelectPerson: handleSelectPerson,
        onAddTree: handleAddTree,
        onRequireAuth: signIn,
        hoveredUnionId,
        hoveredPersonId,
        setHoveredUnionId,
        setHoveredPersonId,
        activeNodeIds,
        selectedPersonId,
      }}
    >
      <div className="relative w-full h-screen bg-slate-950">
        {/* Floating Top Navigation Bar */}
        <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Left: Search Bar */}
          <div className="pointer-events-auto flex items-center gap-2">
            <TreeSearchBar
              people={people}
              personGenerations={personGenerations}
              onSelectPerson={handleSelectPerson}
            />
          </div>

          {/* Right: Stats, Reset & Auth */}
          <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-md text-xs text-slate-300">
            <span className="font-medium text-slate-100">{people.length}</span> người
            <span className="text-slate-600">•</span>
            <span className="font-medium text-amber-300">{maxGeneration}</span> thế hệ
            <span className="text-slate-600">•</span>
            {collapsedMarriageIds.size > 0 ? (
              <button
                onClick={handleExpandAll}
                className="text-sky-400 hover:text-sky-300 text-[11px] underline cursor-pointer"
              >
                Mở rộng tất cả
              </button>
            ) : (
              <button
                onClick={handleCollapseAll}
                className="text-slate-400 hover:text-slate-200 text-[11px] underline cursor-pointer"
              >
                Thu gọn các nhánh
              </button>
            )}

            {/* Editor Actions (Editors only) */}
            {isEditor && (
              <>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => setShowManageEditors(true)}
                  className="px-2.5 py-1 rounded bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 hover:text-indigo-100 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shadow"
                  title="Thêm và quản lý người dùng có quyền Editor"
                >
                  👥 Thêm Editor
                </button>
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="px-2.5 py-1 rounded bg-red-950/90 hover:bg-red-900 border border-red-700/80 text-red-300 hover:text-red-100 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shadow"
                  title="Xóa toàn bộ dữ liệu để test lại từ đầu (Chỉ Editor)"
                >
                  🗑️ Xóa dữ liệu (Reset)
                </button>
              </>
            )}

            <span className="text-slate-600">•</span>
            {/* User status & Login */}
            {!user ? (
              <button
                onClick={() => signIn()}
                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer shadow transition"
              >
                🔑 Đăng nhập Google
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                  {user.email}
                </span>
                <button
                  onClick={() => logOut()}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-0.5"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls className="bg-slate-900! border-slate-700! text-slate-200!" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            bgColor="#090d16"
            maskColor="rgba(2, 6, 23, 0.75)"
            maskStrokeColor="#38bdf8"
            maskStrokeWidth={2}
            nodeBorderRadius={3}
            nodeStrokeColor="#1e293b"
            nodeStrokeWidth={1}
            nodeColor={(n) => {
              if (n.type === "union") {
                return (n.data as { color?: string })?.color || "#eab308";
              }
              const p = (n.data as { person?: Person })?.person;
              if (p?.isPlaceholder) return "#f59e0b";
              if (p?.gender === "female") return "#fb7185";
              return "#38bdf8";
            }}
            onNodeClick={(_event, node) => {
              if (node.type === "person") {
                handleSelectPerson(node.id);
              }
            }}
            className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900"
            style={{ width: 220, height: 160 }}
          />
        </ReactFlow>

        {/* Modal: View Person Details (Read-only for non-editors / visitors) */}
        {viewingPerson && (
          <PersonDetailModal
            person={viewingPerson}
            generation={viewingPersonGeneration}
            people={people}
            marriages={marriages}
            onClose={() => setViewingPersonId(null)}
          />
        )}

        {/* Modal: Edit Person */}
        {editingPerson && (
          <PersonFormModal
            title={
              editingPerson.isPlaceholder
                ? "Thêm thông tin Phối ngẫu"
                : "Chỉnh sửa thông tin thành viên"
            }
            subtitle={
              editingPerson.isPlaceholder
                ? (editingPerson.spouseLabel || "Cập nhật thông tin phối ngẫu (khuyết danh)")
                : `${editingPerson.firstName} ${editingPerson.lastName}`
            }
            submitLabel={editingPerson.isPlaceholder ? "Thêm phối ngẫu" : "Lưu thay đổi"}
            initialData={{
              firstName: editingPerson.isPlaceholder ? "" : editingPerson.firstName,
              lastName: editingPerson.isPlaceholder ? "" : editingPerson.lastName,
              birthDate: editingPerson.birthDate ?? "",
              deathDate: editingPerson.deathDate ?? "",
              gender: editingPerson.gender ?? "female",
              bio: editingPerson.bio ?? "",
              spouseLabel: editingPerson.spouseLabel,
              birthOrder: editingPerson.birthOrder,
              photoURL: editingPerson.photoURL ?? "",
            }}
            onSubmit={handleEditSave}
            onCancel={() => setEditingPersonId(null)}
            onDelete={editingPerson.isPlaceholder ? undefined : handleEditDelete}
          />
        )}

        {/* Modal: Upward Expansion (Add Parents) */}
        {childPersonForAddParent && (
          <AddParentModal
            childPerson={childPersonForAddParent}
            existingParentMarriage={existingParentMarriage}
            people={people}
            onSubmit={handleSaveParent}
            onCancel={() => setAddingParentForChildId(null)}
          />
        )}

        {/* Modal: Sideways Expansion (Add Spouse) */}
        {parentForAddSpouse && (
          <AddSpouseModal
            person={parentForAddSpouse}
            existingMarriages={marriages
              .filter((m) => m.spouseIds.includes(parentForAddSpouse.id))
              .sort((a, b) => a.order - b.order)}
            people={people}
            onSubmit={handleSaveSpouse}
            onCancel={() => setAddingSpouseForPersonId(null)}
          />
        )}

        {/* Modal: Select which spouse for child when 2+ spouses exist */}
        {parentForSelectSpouse && (
          <SelectSpouseForChildModal
            parentPerson={parentForSelectSpouse}
            marriages={marriages
              .filter((m) => m.spouseIds.includes(parentForSelectSpouse.id))
              .sort((a, b) => a.order - b.order)}
            people={people}
            onSelectMarriage={(mId) => {
              setSelectingSpouseForChildParentId(null);
              setAddingChildTargetMarriageId(mId);
            }}
            onAddSpouseFirst={() => {
              const pId = parentForSelectSpouse.id;
              setSelectingSpouseForChildParentId(null);
              setAddingSpouseForPersonId(pId);
            }}
            onCancel={() => setSelectingSpouseForChildParentId(null)}
          />
        )}

        {/* Modal: Downward Expansion (Add Child to specific marriage) */}
        {addingChildTargetMarriageId && (
          <PersonFormModal
            title="Thêm Con (Hậu duệ)"
            subtitle={childTargetParentsSummary || "Thêm con vào gia đình"}
            submitLabel="Thêm con"
            initialData={{
              firstName: "",
              lastName: childTargetDefaultLastName,
              birthDate: "",
              deathDate: "",
              gender: "male",
              bio: "",
              birthOrder: childTargetDefaultOrder,
            }}
            onSubmit={handleSaveChild}
            onCancel={() => setAddingChildTargetMarriageId(null)}
          />
        )}

        {/* Modal: Manage Editors */}
        {showManageEditors && (
          <ManageEditorsModal onClose={() => setShowManageEditors(false)} />
        )}

        {/* Modal: Confirm Reset All Data */}
        {showConfirmReset && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmReset(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-red-800/80 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 text-slate-100 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 text-red-400">
                <span className="text-xl">⚠️</span>
                <h3 className="font-semibold text-base">Xóa toàn bộ dữ liệu cây?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn <strong className="text-white">{people.length} người</strong> và{" "}
                <strong className="text-white">{marriages.length} cuộc hôn nhân</strong> hiện tại trong cơ sở dữ liệu để bạn có thể test lại từ đầu.
              </p>
              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetAllData}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs cursor-pointer shadow disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isResetting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TreeContext.Provider>
  );
}

export function TreeCanvas() {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner />
    </ReactFlowProvider>
  );
}
"use client";

import { usePeople } from "../../person/hooks/usePeople";
import { usePersonMutations } from "../../person/hooks/usePersonMutations";

export function PersonList() {
  const { people, loading } = usePeople();
  const { deletePerson } = usePersonMutations();

  if (loading) return <p>Loading people...</p>;
  if (people.length === 0) return <p className="text-gray-500">No one added yet.</p>;

  return (
    <ul className="flex flex-col gap-2 max-w-sm">
      {people.map((person) => (
        <li
          key={person.id}
          className="flex items-center justify-between border rounded px-3 py-2"
        >
          <div className="flex flex-col">
            <span>
              {person.firstName} {person.lastName}
              {person.birthDate && (
                <span className="text-gray-500 text-sm"> · b. {person.birthDate}</span>
              )}
            </span>
            {person.createdBy && (
              <span className="text-xs text-gray-400">
                Added by {person.createdBy}
              </span>
            )}
          </div>
          <button
            onClick={() => deletePerson(person.id)}
            className="text-red-600 text-sm hover:underline"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function CustomDropdown({ value, onChange, options, label, className = '', searchable = false }) {
  const selectedOption = options.find(opt => opt.value === value)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOptions = searchable
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full px-4 py-3 text-left bg-white rounded-lg border border-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
            <span className="block truncate">{selectedOption?.label || value}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setSearchQuery('')}
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
              {searchable && (
                <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Search..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              <div className="py-1 overflow-auto max-h-52">
                {filteredOptions.length === 0 ? (
                  <div className="py-2 px-4 text-sm text-gray-500 text-center">No results found</div>
                ) : (
                  filteredOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                        }`
                      }
                      value={option.value}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {option.label}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </div>
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}

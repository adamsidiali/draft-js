/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule insertFragmentIntoContentState
 * @typechecks
 * @flow
 */

'use strict';

var BlockMapBuilder = require('BlockMapBuilder');

var generateRandomKey = require('generateRandomKey');
var insertIntoList = require('insertIntoList');
var invariant = require('invariant');

import type {BlockMap} from 'BlockMap';
import type ContentState from 'ContentState';
import type SelectionState from 'SelectionState';

function insertFragmentIntoContentState(
  contentState: ContentState,
  selectionState: SelectionState,
  fragment: BlockMap
): ContentState {
  invariant(
    selectionState.isCollapsed(),
    '`insertFragment` should only be called with a collapsed selection state.'
  );

  var targetKey = selectionState.getStartKey();
  var targetOffset = selectionState.getStartOffset();

  var blockMap = contentState.getBlockMap();

  var fragmentSize = fragment.size;
  var finalKey;
  var finalOffset;

  if (fragmentSize === 1) {
    var targetBlock = blockMap.get(targetKey);
    var pastedBlock = fragment.first();
    var text = targetBlock.getText();
    var chars = targetBlock.getCharacterList();

    var newBlock = targetBlock.merge({
      text: (
        text.slice(0, targetOffset) +
        pastedBlock.getText() +
        text.slice(targetOffset)
      ),
      characterList: insertIntoList(
        chars,
        pastedBlock.getCharacterList(),
        targetOffset
      ),
      data: pastedBlock.getData(),
    });

    blockMap = blockMap.set(targetKey, newBlock);

    finalKey = targetKey;
    finalOffset = targetOffset + pastedBlock.getText().length;

    return contentState.merge({
      blockMap: blockMap.set(targetKey, newBlock),
      selectionBefore: selectionState,
      selectionAfter: selectionState.merge({
        anchorKey: finalKey,
        anchorOffset: finalOffset,
        focusKey: finalKey,
        focusOffset: finalOffset,
        isBackward: false,
      }),
    });
  }

  var newBlockArr = [];

  contentState.getBlockMap().forEach(
    (block, blockKey) => {
      if (blockKey !== targetKey) {
        newBlockArr.push(block);
        return;
      }

      var text = block.getText();
      var chars = block.getCharacterList();

      // Modify head portion of block.
      var blockSize = text.length;
      var headText = text.slice(0, targetOffset);
      var headCharacters = chars.slice(0, targetOffset);
      var appendToHead = fragment.first();

      var modifiedHead = block.merge({
        text: headText + appendToHead.getText(),
        characterList: headCharacters.concat(appendToHead.getCharacterList()),
        type: headText ? block.getType() : appendToHead.getType(),
        data: appendToHead.getData(),
      });

      newBlockArr.push(modifiedHead);

      // Insert fragment blocks after the head and before the tail.
      fragment.slice(1, fragmentSize - 1).forEach(
        fragmentBlock => {
          newBlockArr.push(fragmentBlock.set('key', generateRandomKey()));
        }
      );

      // Modify tail portion of block.
      var tailText = text.slice(targetOffset, blockSize);
      var tailCharacters = chars.slice(targetOffset, blockSize);
      var prependToTail = fragment.last();
      finalKey = generateRandomKey();

      var modifiedTail = prependToTail.merge({
        key: finalKey,
        text: prependToTail.getText() + tailText,
        characterList: prependToTail
          .getCharacterList()
          .concat(tailCharacters),
        data: prependToTail.getData(),
      });

      newBlockArr.push(modifiedTail);
    }
  );

  finalOffset = fragment.last().getLength();

  return contentState.merge({
    blockMap: BlockMapBuilder.createFromArray(newBlockArr),
    selectionBefore: selectionState,
    selectionAfter: selectionState.merge({
      anchorKey: finalKey,
      anchorOffset: finalOffset,
      focusKey: finalKey,
      focusOffset: finalOffset,
      isBackward: false,
    }),
  });
}

module.exports = insertFragmentIntoContentState;
